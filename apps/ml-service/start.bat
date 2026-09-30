@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  echo Creating venv...
  python -m venv .venv
  .venv\Scripts\python.exe -m pip install -r requirements.txt
)
echo Starting ML service on http://127.0.0.1:8000
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
