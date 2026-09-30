"""
Cars Compound ML service — ONNX YOLO-seg damage inference.

Run locally:
  cd apps/ml-service
  pip install -r requirements.txt
  uvicorn app.main:app --host 0.0.0.0 --port 8000

Env:
  DAMAGE_ONNX_PATH=models/damage.onnx   (optional PARTS_ONNX_PATH)
  SEVERITY_LIGHT_MAX=0.08
  SEVERITY_MEDIUM_MAX=0.25
  CONF_THRESHOLD=0.25
  USE_MOCK_IF_NO_MODEL=1
"""
from __future__ import annotations

import io
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image
import httpx

app = FastAPI(title="Cars Compound Damage ML", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# CarDD / our Colab export class order
DAMAGE_NAMES = [
    "dent",
    "scratch",
    "crack",
    "glass_shatter",
    "lamp_broken",
    "tire_flat",
]

DAMAGE_TO_UI = {
    "dent": "dent",
    "scratch": "scratch",
    "crack": "crack",
    "glass_shatter": "glass_damage",
    "lamp_broken": "other_damage",
    "tire_flat": "other_damage",
}


class AnalyzeIn(BaseModel):
    imageUrls: list[str] = Field(default_factory=list)
    vehicle: dict[str, Any] = Field(default_factory=dict)
    paint: dict[str, Any] = Field(default_factory=dict)


def severity_from_area(area_frac: float) -> tuple[str, str]:
    light = float(os.getenv("SEVERITY_LIGHT_MAX", "0.08"))
    medium = float(os.getenv("SEVERITY_MEDIUM_MAX", "0.25"))
    if area_frac < light:
        return "light", "repair"
    if area_frac < medium:
        return "medium", "repair"
    return "heavy", "replace"


def part_from_bbox(x: float, y: float, w: float, h: float, damage: str) -> tuple[str, str]:
    """Heuristic panel label until a dedicated parts model exists."""
    cx, cy = x + w / 2, y + h / 2
    if damage == "glass_shatter":
        return ("Windshield" if cy < 0.45 else "Glass panel"), "center"
    if damage == "lamp_broken":
        side = "left" if cx < 0.5 else "right"
        return (f"{'Left' if side == 'left' else 'Right'} lamp", side)
    if damage == "tire_flat":
        side = "left" if cx < 0.5 else "right"
        return (f"{'Left' if side == 'left' else 'Right'} tire", side)

    if cy < 0.35:
        return "Hood", "front"
    if cy > 0.72:
        side = "front" if cx < 0.55 else "rear"
        return ("Front bumper cover" if side == "front" else "Rear bumper cover"), side
    if cx < 0.33:
        return ("Left front fender" if cy < 0.55 else "Left door"), "left"
    if cx > 0.67:
        return ("Right front fender" if cy < 0.55 else "Right door"), "right"
    return "Body panel", "center"


def mock_detections(n_images: int) -> list[dict[str, Any]]:
    return [
        {
            "id": str(uuid.uuid4()),
            "partName": "Front bumper cover",
            "side": "front",
            "damageType": "scratch",
            "severity": "medium",
            "operation": "repair",
            "confidence": 0.8,
            "imageIndex": 0,
            "bbox": {"x": 0.28, "y": 0.55, "w": 0.44, "h": 0.22},
        },
        {
            "id": str(uuid.uuid4()),
            "partName": "Left front fender",
            "side": "left",
            "damageType": "dent",
            "severity": "heavy",
            "operation": "replace",
            "confidence": 0.75,
            "imageIndex": min(1, max(0, n_images - 1)),
            "bbox": {"x": 0.08, "y": 0.32, "w": 0.3, "h": 0.35},
        },
    ]


def resolve_path(raw: str) -> Path:
    p = Path(raw)
    if p.is_file():
        return p
    # cwd may be apps/ml-service or repo root
    here = Path(__file__).resolve().parents[1] / raw
    return here


class ModelBundle:
    def __init__(self) -> None:
        self.damage_path: Path | None = None
        self.parts_path: Path | None = None
        self.damage_model: Any = None

    @property
    def ready(self) -> bool:
        return self.damage_path is not None and self.damage_path.is_file()


BUNDLE = ModelBundle()


def load_models() -> None:
    damage = resolve_path(os.getenv("DAMAGE_ONNX_PATH", "models/damage.onnx"))
    parts = resolve_path(os.getenv("PARTS_ONNX_PATH", "models/parts.onnx"))
    BUNDLE.damage_path = damage if damage.is_file() else None
    BUNDLE.parts_path = parts if parts.is_file() else None
    BUNDLE.damage_model = None
    if not BUNDLE.damage_path:
        return
    try:
        from ultralytics import YOLO

        BUNDLE.damage_model = YOLO(str(BUNDLE.damage_path))
    except Exception as e:  # noqa: BLE001
        print(f"[ml-service] Failed to load YOLO ONNX: {e}")
        BUNDLE.damage_model = None


load_models()


def detections_from_result(result: Any, image_index: int) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    boxes = getattr(result, "boxes", None)
    if boxes is None or len(boxes) == 0:
        return out

    names = getattr(result, "names", None) or {i: n for i, n in enumerate(DAMAGE_NAMES)}
    conf_min = float(os.getenv("CONF_THRESHOLD", "0.25"))
    masks = getattr(result, "masks", None)

    for i in range(len(boxes)):
        conf = float(boxes.conf[i].item()) if boxes.conf is not None else 0.0
        if conf < conf_min:
            continue
        cls_id = int(boxes.cls[i].item()) if boxes.cls is not None else 0
        raw_name = str(names.get(cls_id, DAMAGE_NAMES[cls_id] if cls_id < len(DAMAGE_NAMES) else "scratch"))
        damage_ui = DAMAGE_TO_UI.get(raw_name, raw_name)

        # xyxyn → normalized xywh
        xyxy = boxes.xyxyn[i].tolist()
        x1, y1, x2, y2 = [float(v) for v in xyxy]
        x, y = max(0.0, x1), max(0.0, y1)
        w, h = max(0.0, x2 - x1), max(0.0, y2 - y1)

        area = w * h
        if masks is not None and getattr(masks, "data", None) is not None and i < len(masks.data):
            m = masks.data[i]
            area = float(m.sum().item()) / float(m.numel() or 1)

        sev, op = severity_from_area(area)
        if raw_name in ("glass_shatter", "lamp_broken"):
            op = "replace"
        part_name, side = part_from_bbox(x, y, w, h, raw_name)

        out.append(
            {
                "id": str(uuid.uuid4()),
                "partName": part_name,
                "side": side,
                "damageType": damage_ui,
                "severity": sev,
                "operation": op,
                "confidence": round(conf, 4),
                "imageIndex": image_index,
                "bbox": {
                    "x": round(x, 4),
                    "y": round(y, 4),
                    "w": round(w, 4),
                    "h": round(h, 4),
                },
            }
        )
    return out


async def fetch_image_bytes(url: str) -> bytes | None:
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            r = await client.get(url)
            if r.status_code == 200:
                return r.content
    except Exception:  # noqa: BLE001
        return None
    return None


@app.get("/health")
def health():
    return {
        "ok": True,
        "modelsLoaded": BUNDLE.ready and BUNDLE.damage_model is not None,
        "damageOnnx": str(BUNDLE.damage_path) if BUNDLE.damage_path else None,
        "partsOnnx": str(BUNDLE.parts_path) if BUNDLE.parts_path else None,
        "mode": "onnx" if BUNDLE.damage_model is not None else "mock_fallback",
    }


@app.post("/analyze")
async def analyze(body: AnalyzeIn):
    notes: list[str] = []
    n = max(1, len(body.imageUrls))
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    if BUNDLE.damage_model is None:
        if os.getenv("USE_MOCK_IF_NO_MODEL", "1") not in ("1", "true", "yes"):
            return {
                "provider": "onnx",
                "isSample": False,
                "detections": [],
                "notes": ["damage.onnx missing or failed to load — place under apps/ml-service/models/"],
                "analyzedAt": now,
            }
        notes.append("ONNX model not loaded — returning labeled MOCK detections")
        dets = mock_detections(n)
        for d in dets:
            area = float(d["bbox"]["w"]) * float(d["bbox"]["h"])
            sev, op = severity_from_area(area)
            d["severity"] = sev
            d["operation"] = op
        return {
            "provider": "onnx_mock_fallback",
            "isSample": True,
            "detections": dets,
            "notes": notes,
            "analyzedAt": now,
        }

    detections: list[dict[str, Any]] = []
    if not body.imageUrls:
        notes.append("No imageUrls provided")
    else:
        for idx, url in enumerate(body.imageUrls):
            raw = await fetch_image_bytes(url)
            if not raw:
                notes.append(f"Could not download image[{idx}]")
                continue
            try:
                Image.open(io.BytesIO(raw)).verify()
                img = Image.open(io.BytesIO(raw)).convert("RGB")
            except Exception as e:  # noqa: BLE001
                notes.append(f"Bad image[{idx}]: {e}")
                continue
            try:
                results = BUNDLE.damage_model.predict(img, verbose=False, conf=float(os.getenv("CONF_THRESHOLD", "0.25")))
                for r in results:
                    detections.extend(detections_from_result(r, idx))
            except Exception as e:  # noqa: BLE001
                notes.append(f"Inference failed on image[{idx}]: {e}")

    if not detections and body.imageUrls:
        notes.append("No damage detections above confidence threshold")

    notes.append("CarDD damage ONNX - panel names are location heuristics until parts.onnx exists")
    return {
        "provider": "onnx",
        "isSample": False,
        "detections": detections,
        "notes": notes,
        "analyzedAt": now,
    }
