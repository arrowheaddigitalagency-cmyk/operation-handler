"""
Convert CarDD COCO segmentation → YOLO-seg format for damage training.

Input (already on disk after your Google Drive download):
  datasets/raw/CarDD/CarDD_release/CarDD_release/CarDD_COCO/

Output:
  datasets/yolo/damage/   (ready for Colab / Ultralytics)

Run from ml/damage-model:
  python scripts/convert_cardd_to_yolo.py
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COCO_ROOT = ROOT / "datasets" / "raw" / "CarDD" / "CarDD_release" / "CarDD_release" / "CarDD_COCO"
OUT = ROOT / "datasets" / "yolo" / "damage"

# CarDD category id → YOLO class id (0-based)
# 1 dent, 2 scratch, 3 crack, 4 glass shatter, 5 lamp broken, 6 tire flat
CLASS_NAMES = [
    "dent",
    "scratch",
    "crack",
    "glass_shatter",
    "lamp_broken",
    "tire_flat",
]


def coco_poly_to_yolo(seg, w: int, h: int) -> list[float]:
    """Flatten polygon [x1,y1,x2,y2,...] → normalized YOLO seg coords."""
    if not seg or not isinstance(seg[0], (list, float, int)):
        return []
    # COCO can be list of polygons
    poly = seg[0] if isinstance(seg[0], list) else seg
    if len(poly) < 6:
        return []
    out: list[float] = []
    for i in range(0, len(poly), 2):
        x = float(poly[i]) / w
        y = float(poly[i + 1]) / h
        out.extend([max(0.0, min(1.0, x)), max(0.0, min(1.0, y))])
    return out


def convert_split(split: str, ann_file: str, img_dirname: str) -> int:
    ann_path = COCO_ROOT / "annotations" / ann_file
    img_dir = COCO_ROOT / img_dirname
    if not ann_path.exists():
        print("SKIP missing", ann_path)
        return 0

    data = json.loads(ann_path.read_text(encoding="utf-8"))
    images = {im["id"]: im for im in data["images"]}
    by_img: dict[int, list] = {}
    for ann in data["annotations"]:
        by_img.setdefault(ann["image_id"], []).append(ann)

    out_split = "val" if split == "val" else ("val" if split == "test" else "train")
    # Keep test as val too if we only have train/val folders in YOLO layout; map test→val
    if split == "test":
        out_split = "val"

    img_out = OUT / "images" / out_split
    lbl_out = OUT / "labels" / out_split
    img_out.mkdir(parents=True, exist_ok=True)
    lbl_out.mkdir(parents=True, exist_ok=True)

    n = 0
    for img_id, im in images.items():
        file_name = im["file_name"]
        src = img_dir / file_name
        if not src.exists():
            # sometimes nested
            candidates = list(img_dir.rglob(file_name))
            if not candidates:
                continue
            src = candidates[0]
        w, h = im["width"], im["height"]
        lines: list[str] = []
        for ann in by_img.get(img_id, []):
            cid = int(ann["category_id"]) - 1
            if cid < 0 or cid >= len(CLASS_NAMES):
                continue
            if ann.get("iscrowd"):
                continue
            seg = ann.get("segmentation")
            if not seg:
                continue
            # skip RLE dicts
            if isinstance(seg, dict):
                continue
            coords = coco_poly_to_yolo(seg, w, h)
            if len(coords) < 6:
                continue
            lines.append(str(cid) + " " + " ".join(f"{c:.6f}" for c in coords))

        dest_name = Path(file_name).name
        shutil.copy2(src, img_out / dest_name)
        (lbl_out / (Path(dest_name).stem + ".txt")).write_text(
            "\n".join(lines) + ("\n" if lines else ""),
            encoding="utf-8",
        )
        n += 1
    return n


def write_yaml() -> None:
    yaml = OUT / "data.yaml"
    # Ultralytics wants path relative or absolute
    content = [
        "path: .",
        "train: images/train",
        "val: images/val",
        "names:",
    ]
    for i, name in enumerate(CLASS_NAMES):
        content.append(f"  {i}: {name}")
    yaml.write_text("\n".join(content) + "\n", encoding="utf-8")
    print("Wrote", yaml)


def main() -> None:
    if not COCO_ROOT.exists():
        raise SystemExit(f"CarDD_COCO not found at {COCO_ROOT}")

    print("Converting CarDD -> YOLO-seg ...")
    # Reset output labels/images lightly
    if OUT.exists():
        print("Output folder exists — adding/overwriting files in place")

    n_train = convert_split("train", "instances_train2017.json", "train2017")
    n_val = convert_split("val", "instances_val2017.json", "val2017")
    n_test = convert_split("test", "instances_test2017.json", "test2017")
    write_yaml()

    print(f"Done. train={n_train} val(+test mapped)={n_val + n_test}")
    print(f"Upload THIS folder to Google Drive for Colab:")
    print(f"  {OUT}")
    print("Drive suggestion path: MyDrive/cars-compound-yolo/damage/")


if __name__ == "__main__":
    main()
