# START HERE — CarDD already downloaded ✅

Tumhare folder mein ye hai:
- `datasets/raw/CarDD/CarDD.pdf` (paper — training ke liye zaroori nahi)
- `datasets/raw/CarDD/CarDD_release/` → andar **CarDD_COCO** (ye use hoga)
- `CarDD_release.zip` (~6 GB) — unzip ho chuka hai; zip rakhne ki zaroorat nahi (disk bachao to delete kar sakte ho)

---

## Step 1 — PC pe convert (main / tum)

PowerShell:

```powershell
cd "d:\Projects\Operation Handler\ml\damage-model"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python scripts/convert_cardd_to_yolo.py
```

Is ke baad banega: `datasets/yolo/damage/` (images + labels + data.yaml)

---

## Step 2 — Google Drive pe upload (Colab connection)

1. Browser: https://drive.google.com  
2. Folder banao: `cars-compound-yolo`  
3. Uske andar folder `damage`  
4. PC se **poora** `ml/damage-model/datasets/yolo/damage` ka content us Drive `damage` folder mein upload karo  
   (images, labels, data.yaml)

Yahi “apnay system se Colab ka connection” hai: **Drive shared folder**.

---

## Step 3 — Colab training (tum click, free GPU)

1. https://colab.research.google.com open karo (Google account)  
2. File → Upload notebook → choose  
   `ml/damage-model/colab/Train_Damage_YOLO11.ipynb`  
3. Runtime → Change runtime type → **GPU (T4)** → Save  
4. Upar se **Run all** (ya har cell shift+enter)  
5. Pehla Drive mount cell allow karo  
6. Training khatam hone ke baad Files panel se download:  
   `runs/damage/weights/best.onnx`  
7. Us file ko PC pe copy:  
   `apps/ml-service/models/damage.onnx`

---

## Step 4 — App se connect

`.env` mein:

```
DAMAGE_PROVIDER=onnx
ML_SERVICE_URL=http://127.0.0.1:8000
```

Phir ML service + API start (baad mein commands dunga).

---

## Notes (simple)

| Cheez | Matlab |
|--------|--------|
| CarDD | Damage types: dent, scratch, crack, glass, lamp, tire |
| Parts model | CarDD mein parts nahi — pehle **damage** model; parts baad / alag data |
| Kaggle | Extra data chahiye ho to baad mein; ab CarDD kaafi hai start ke liye |
| Roboflow | Mat use karo (10 credits) |
| PDF | Sirf paper/docs — skip OK |

Jab Step 1 convert ho jaye, mujhe bolo **“convert done”** — main confirm karunga counts, phir Colab cells exact order mein walkthrough.
