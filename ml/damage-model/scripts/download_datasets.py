"""
Download FREE car-parts / car-damage datasets.

DEFAULT: does NOT use Roboflow (free accounts often have only ~10 credits).
Uses: Kaggle (free) + Ultralytics sample assets + CarDD GitHub instructions.

Only if you set USE_ROBOFLOW=1 will it call Roboflow (uses credits — avoid).

Run: python scripts/download_datasets.py
"""
from __future__ import annotations

import os
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "datasets" / "raw"
RAW.mkdir(parents=True, exist_ok=True)


def load_dotenv_soft() -> None:
    env_path = ROOT.parents[1] / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print("+", " ".join(cmd))
    subprocess.check_call(cmd, cwd=str(cwd) if cwd else None)


def download_ultralytics_hints() -> None:
    """Ultralytics ships example segs; Colab can also `yolo train data=coco8-seg.yaml` for a smoke test."""
    out = RAW / "ultralytics"
    out.mkdir(parents=True, exist_ok=True)
    note = out / "README.txt"
    note.write_text(
        "FREE path (no Roboflow credits):\n"
        "1) In Google Colab, for a quick smoke-test train:\n"
        "     YOLO('yolo11n-seg.pt').train(data='coco8-seg.yaml', epochs=5)\n"
        "2) For real car parts, prefer Kaggle + CarDD (below).\n"
        "3) Optional Ultralytics Hub / docs carparts-seg examples:\n"
        "     https://docs.ultralytics.com/datasets/segment/\n",
        encoding="utf-8",
    )
    # Tiny public sample image list placeholder so folder exists for merge
    print("Ultralytics: wrote free-path notes →", note)


def download_roboflow() -> None:
    """OFF by default — Roboflow free tier burns credits fast."""
    if os.environ.get("USE_ROBOFLOW", "").strip() not in ("1", "true", "yes"):
        print("SKIP Roboflow (default). Only 10 free credits — do not burn them.")
        print("  If you really need it later: set USE_ROBOFLOW=1 in .env")
        return

    key = os.environ.get("ROBOFLOW_API_KEY", "").strip()
    if not key:
        print("SKIP Roboflow — USE_ROBOFLOW=1 but ROBOFLOW_API_KEY missing")
        return
    try:
        from roboflow import Roboflow
    except ImportError:
        print("pip install roboflow first")
        return

    rf = Roboflow(api_key=key)
    out = RAW / "roboflow"
    out.mkdir(parents=True, exist_ok=True)
    # ONE dataset only to save credits
    targets = [
        ("roboflow-universe-projects", "car-damage", 1),
    ]
    print("WARNING: Roboflow download uses credits. Downloading at most 1 dataset.")
    for workspace, project, version in targets:
        try:
            print(f"Roboflow: {workspace}/{project} v{version}")
            proj = rf.workspace(workspace).project(project)
            ver = proj.version(version)
            ver.download("yolov8", location=str(out / f"{project}-v{version}"))
        except Exception as e:  # noqa: BLE001
            print(f"  WARN could not download {project}: {e}")


def download_kaggle() -> None:
    user = os.environ.get("KAGGLE_USERNAME", "").strip()
    key = os.environ.get("KAGGLE_KEY", "").strip()
    if not user or not key:
        print("SKIP Kaggle — set KAGGLE_USERNAME and KAGGLE_KEY (this is the main FREE source)")
        return

    kaggle_dir = Path.home() / ".kaggle"
    kaggle_dir.mkdir(parents=True, exist_ok=True)
    cred = kaggle_dir / "kaggle.json"
    cred.write_text(f'{{"username":"{user}","key":"{key}"}}', encoding="utf-8")
    try:
        os.chmod(cred, 0o600)
    except OSError:
        pass

    out = RAW / "kaggle"
    out.mkdir(parents=True, exist_ok=True)
    datasets = [
        "anujms/car-damage-detection",
        "ashishjangir/car-damage-severity-dataset",
        "nderic/car-damage-detection",
    ]
    for slug in datasets:
        try:
            run(
                [
                    sys.executable,
                    "-m",
                    "kaggle",
                    "datasets",
                    "download",
                    "-d",
                    slug,
                    "-p",
                    str(out / slug.replace("/", "_")),
                    "--unzip",
                ]
            )
        except Exception as e:  # noqa: BLE001
            print(f"  WARN Kaggle {slug}: {e}")
            print("  Open https://www.kaggle.com/datasets and search 'car damage' — download ZIP free in browser if API fails.")


def note_cardd() -> None:
    dest = RAW / "CarDD"
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "GET_CarDD.txt").write_text(
        "CarDD — FREE academic car-damage dataset (no Roboflow credits).\n\n"
        "Official project page (download dataset here):\n"
        "  https://cardd-ustc.github.io/\n\n"
        "GitHub (code + docs; dataset link is on the website):\n"
        "  https://github.com/CarDD-USTC/CarDD-USTC.github.io\n\n"
        "Steps:\n"
        "1) Open https://cardd-ustc.github.io/\n"
        "2) Download the dataset (usually Google Drive, ~2–3 GB)\n"
        "3) Put CarDD_COCO under ml/damage-model/datasets/raw/CarDD\n"
        "4) Run: python scripts/merge_to_yolo.py\n",
        encoding="utf-8",
    )
    print("CarDD: see", dest / "GET_CarDD.txt")


def main() -> None:
    load_dotenv_soft()
    print("Downloading into", RAW)
    print("=== FREE-first mode (Roboflow OFF unless USE_ROBOFLOW=1) ===")
    download_ultralytics_hints()
    note_cardd()
    download_kaggle()
    download_roboflow()
    print("Done. Next: python scripts/merge_to_yolo.py")
    print("Then train in Colab — see colab/Train_Damage_YOLO11.ipynb")


if __name__ == "__main__":
    main()
