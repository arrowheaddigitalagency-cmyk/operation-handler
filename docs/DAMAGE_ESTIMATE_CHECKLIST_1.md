# What I need from you (Checklist #1)

I can keep building the Nest API + customer UI + sample pricing **without** these.  
I **cannot** finish real YOLO training downloads or Gemini fallback until you complete the items below.

Reply with: which items you finished, and paste only the **env values** into your local `.env` (never into chat if you prefer — say “done in .env” instead).

---

## 1) Google account (for free Colab GPU training)

| | |
|--|--|
| **What** | A normal Google / Gmail login |
| **Why** | Training YOLO models needs a free GPU. Colab gives that when you open our notebook |
| **Link** | https://colab.research.google.com/ |
| **Steps** | 1) Open the link 2) Sign in with Google 3) Tell me “Google Colab works” |
| **Env** | None yet |

---

## 2) Kaggle free account + API token (dataset download)

| | |
|--|--|
| **What** | Free Kaggle account + a small key file |
| **Why** | Some car-damage severity datasets are on Kaggle; scripts need your token to download |
| **Link** | https://www.kaggle.com/account |
| **Steps** | 1) Create/login Kaggle 2) Scroll to **API** 3) Click **Create New Token** 4) It downloads `kaggle.json` 5) Keep that file safe on your PC (do not email it) |
| **Env (later)** | We will put credentials as `KAGGLE_USERNAME` and `KAGGLE_KEY` in `.env` / Colab secrets — I will tell you exact names when the download script is ready |

---

## 3) Roboflow free account + API key (dataset download)

| | |
|--|--|
| **What** | Free Roboflow Universe account |
| **Why** | Car-damage / car-parts datasets on Roboflow need a free API key to download |
| **Link** | https://app.roboflow.com/account/api |
| **Steps** | 1) Sign up free at https://roboflow.com 2) Open API keys page 3) Copy **Private API Key** |
| **Env** | `ROBOFLOW_API_KEY=...` (add to `.env` when I say so) |

---

## 4) Google Gemini API key (optional, free tier)

| | |
|--|--|
| **What** | Free Gemini developer key |
| **Why** | Backup AI if our ONNX model is not ready or fails; **optional** — demo works with mock/ONNX without it |
| **Link** | https://aistudio.google.com/apikey |
| **Steps** | 1) Sign in with Google 2) Click **Create API key** 3) Copy the key |
| **Env** | `GEMINI_API_KEY=...` and later `DAMAGE_PROVIDER=gemini` only when you want that path |

---

## 5) Hosting accounts (for the final deploy guide — not needed to code locally)

| Item | Link | Notes |
|------|------|--------|
| Vercel (frontend) | https://vercel.com | Free hobby OK |
| Neon Postgres (recommended free DB) | https://console.neon.tech | Free tier |
| Railway | https://railway.com | If your trial ended, use **Hobby paid** or put API on Hostinger — **do not** make fake accounts for a second free trial |

---

## What I do **not** need from you right now
- Paid CCC / PartsTech / MOTOR / Tractable keys (we are free-only)
- Changing `/assess` or `/book`

## What I will do next (after you reply “continue” or finish 1–3)
1. Finish Nest `damage-estimate` API (VIN, photos, mock AI, price, book, versions)
2. Customer wizard UI end-to-end with Sample data badge
3. Then ML folder + Colab notebook (using your Kaggle/Roboflow keys)
