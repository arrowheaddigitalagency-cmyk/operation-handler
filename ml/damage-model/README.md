# Damage model training (free datasets → YOLO11 → ONNX)

## Important: Roboflow 10 credits

**Do NOT use Roboflow for big downloads.** Free accounts often get ~10 credits; each dataset export burns them.

We train mainly with:
1. **Kaggle** (free with your API key) — car damage datasets  
2. **CarDD** from GitHub / academic links (free)  
3. **Ultralytics** sample / COCO8-seg for a quick Colab smoke test  
4. Roboflow = **optional only** if you set `USE_ROBOFLOW=1` (avoid)

## What you need in `.env`

```
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_api_token
GEMINI_API_KEY=your_gemini_key
# ROBOFLOW_API_KEY=...   # keep for later, but leave USE_ROBOFLOW unset
# USE_ROBOFLOW=1         # only if you intentionally want to spend a credit
```

## Local scripts

```bash
cd ml/damage-model
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python scripts/download_datasets.py
python scripts/merge_to_yolo.py
```

Then open `colab/Train_Damage_YOLO11.ipynb` in Colab (GPU), upload `datasets/yolo` to Drive, Run all.

## Outputs

- `runs/parts/weights/best.onnx`
- `runs/damage/weights/best.onnx`  
→ copy into `apps/ml-service/models/`
