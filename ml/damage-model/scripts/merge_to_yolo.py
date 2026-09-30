"""
Merge downloaded datasets into two YOLO-seg datasets:
  datasets/yolo/parts
  datasets/yolo/damage

Class lists are unified and documented in data.yaml.
This is a best-effort converter: YOLO folders are copied; other layouts get a stub tree
so Colab can still run on whatever you place under images/labels.
"""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "datasets" / "raw"
YOLO = ROOT / "datasets" / "yolo"

PARTS_NAMES = [
    "bumper_front",
    "bumper_rear",
    "fender_left",
    "fender_right",
    "door_front_left",
    "door_front_right",
    "door_rear_left",
    "door_rear_right",
    "hood",
    "trunk",
    "headlamp_left",
    "headlamp_right",
    "taillamp_left",
    "taillamp_right",
    "quarter_left",
    "quarter_right",
    "windshield",
    "roof",
    "mirror_left",
    "mirror_right",
    "grille",
    "other_part",
]

DAMAGE_NAMES = [
    "dent",
    "scratch",
    "crack",
    "tear",
    "paint_damage",
    "glass_damage",
    "other_damage",
]


def write_yaml(path: Path, names: list[str], train: str, val: str) -> None:
    lines = [
        f"path: {path.parent.as_posix()}",
        f"train: {train}",
        f"val: {val}",
        "names:",
    ]
    for i, n in enumerate(names):
        lines.append(f"  {i}: {n}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def ensure_split(base: Path) -> None:
    for split in ("train", "val"):
        (base / "images" / split).mkdir(parents=True, exist_ok=True)
        (base / "labels" / split).mkdir(parents=True, exist_ok=True)


def copy_yolo_tree(src: Path, dest: Path) -> int:
    """Copy a Roboflow/Ultralytics YOLOv8 export if images/labels exist."""
    count = 0
    for split_name in ("train", "valid", "val", "test"):
        img_dir = src / split_name / "images"
        lbl_dir = src / split_name / "labels"
        if not img_dir.exists():
            img_dir = src / "images" / split_name
            lbl_dir = src / "labels" / split_name
        if not img_dir.exists():
            continue
        out_split = "val" if split_name in ("valid", "val", "test") else "train"
        for img in list(img_dir.glob("*.*")):
            if img.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
                continue
            shutil.copy2(img, dest / "images" / out_split / img.name)
            lbl = lbl_dir / (img.stem + ".txt")
            if lbl.exists():
                shutil.copy2(lbl, dest / "labels" / out_split / lbl.name)
            count += 1
    return count


def main() -> None:
    parts = YOLO / "parts"
    damage = YOLO / "damage"
    ensure_split(parts)
    ensure_split(damage)

    total_parts = 0
    total_damage = 0
    if RAW.exists():
        for folder in RAW.rglob("*"):
            if not folder.is_dir():
                continue
            name = folder.name.lower()
            if "part" in name and ("yolo" in name or (folder / "data.yaml").exists() or (folder / "train").exists()):
                n = copy_yolo_tree(folder, parts)
                total_parts += n
                if n:
                    print(f"parts +{n} from {folder}")
            if "damage" in name and ("yolo" in name or (folder / "data.yaml").exists() or (folder / "train").exists()):
                n = copy_yolo_tree(folder, damage)
                total_damage += n
                if n:
                    print(f"damage +{n} from {folder}")

    write_yaml(parts / "data.yaml", PARTS_NAMES, "images/train", "images/val")
    write_yaml(damage / "data.yaml", DAMAGE_NAMES, "images/train", "images/val")

    (YOLO / "README.txt").write_text(
        f"Parts images copied: {total_parts}\nDamage images copied: {total_damage}\n"
        "If counts are 0, download Roboflow YOLO exports into datasets/raw then re-run.\n"
        "Severity later uses mask area % thresholds in apps/ml-service (light/medium/heavy).\n",
        encoding="utf-8",
    )
    print("Wrote", parts / "data.yaml", "and", damage / "data.yaml")
    print("Parts images:", total_parts, "| Damage images:", total_damage)


if __name__ == "__main__":
    main()
