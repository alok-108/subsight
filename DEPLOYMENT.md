# SUBSIGHT Deployment & Operations Guide (100% Free Tier)

This document details the production architecture, step-by-step deployment procedure, environment variables, keep-alive monitoring, rollback strategy, and demo-day pre-flight checklist for **SUBSIGHT**.

---

## ⚡ Live Production Endpoints

| Service | URL |
|---------|-----|
| 🌐 **Frontend (Vercel)** | [https://subsight-app.vercel.app](https://subsight-app.vercel.app) |
| ⚙️ **Backend API (Render)** | [https://subsight-api-v2.onrender.com](https://subsight-api-v2.onrender.com) |
| 📖 **Swagger UI / API Docs** | [https://subsight-api-v2.onrender.com/docs](https://subsight-api-v2.onrender.com/docs) |
| ❤️ **Health Check** | [https://subsight-api-v2.onrender.com/api/health](https://subsight-api-v2.onrender.com/api/health) |
| 📦 **GitHub Repository** | [https://github.com/kdutt0974-source/subsight](https://github.com/kdutt0974-source/subsight) |

---

## 1. Production Architecture Overview

```
                        +---------------------------------------------+
                        |                 User Browser                |
                        +---------------------------------------------+
                                       |              |
                       HTML / Assets   |              | API Calls (HTTPS)
                                       v              v
               +-----------------------------+  +-------------------------------+
               |      Vercel Frontend        |  |     Render Web Service        |
               | (Next.js 16 App Router,     |  |       (FastAPI Python)        |
               |  Tailwind CSS, TanStack)    |  |     `subsight-api.onrender`   |
               +-----------------------------+  +-------------------------------+
                                                  |              |
                                 Database Queries |              | Statement Storage
                                                  v              v
                       +-----------------------------+  +-------------------------------+
                       |  Render PostgreSQL (Free)   |  |     Cloudflare R2 Storage     |
                       |    (1 GB, 0.1 CPU, SSL)     |  |     (or Local Disk fallback)  |
                       +-----------------------------+  +-------------------------------+
                                                                 ^
                                                                 | Keep-Alive Pings
                                                        +-------------------------------+
                                                        |      cron-job.org Worker      |
                                                        |     (Every 10 min, HTTP)      |
                                                        +-------------------------------+
```

| Component | Provider | Plan | Cost | Description |
|-----------|----------|------|------|-------------|
| **Frontend** | Vercel | Hobby (Free) | ₹0 / mo | Next.js 16 (App Router), static + SSR, edge CDN |
| **Backend** | Render | Free Web Service | ₹0 / mo | Python 3.11 FastAPI uvicorn runner, 512 MB RAM |
| **Database** | Render | Free PostgreSQL | ₹0 / mo | Managed PostgreSQL 16 (1 GB storage, connection pooling) |
| **Storage** | Cloudflare R2 | Free Tier | ₹0 / mo | 10 GB storage, 0 egress fees (falls back to local disk if unconfigured) |
| **Keep-Alive** | cron-job.org | Free Tier | ₹0 / mo | 10-minute HTTP ping to `/api/health` to eliminate cold starts |

---

## 2. Environment Variables Specification

### Backend (Render Web Service)
Configure these in the Render Dashboard under **Environment**:

| Variable | Required | Default / Example | Purpose |
|----------|----------|-------------------|---------|
| `DATABASE_URL` | Yes | `postgresql+psycopg://...` | Connection string to Render PostgreSQL (injected automatically via Blueprint) |
| `ALLOWED_ORIGINS` | Yes | `https://subsight.vercel.app,http://localhost:3000` | Comma-separated list of allowed CORS origins |
| `ENV` | Yes | `production` | Production environment flag |
| `DEMO_MODE` | No | `true` | Allows instant demo seeding and synthetic data resets |
| `STORAGE_BACKEND` | No | `local` (or `r2`) | Storage strategy (`r2` for Cloudflare, `local` for container storage) |
| `R2_ACCOUNT_ID` | Conditional | `""` | Cloudflare account ID (required if `STORAGE_BACKEND=r2`) |
| `R2_ACCESS_KEY_ID` | Conditional | `""` | Cloudflare R2 Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Conditional | `""` | Cloudflare R2 Secret Access Key |
| `R2_BUCKET` | Conditional | `subsight-uploads` | S3-compatible bucket name |
| `R2_PUBLIC_BASE_URL` | No | `""` | Optional public CDN URL for statements |
| `PYTHON_VERSION` | Yes | `3.11.9` | Pinned Python runtime for Render container build |

### Frontend (Vercel)
Configure these in the Vercel Project Settings under **Environment Variables**:

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | `https://subsight-api.onrender.com` | Base URL of the deployed FastAPI backend |

---

## 3. Step-by-Step Deployment Instructions

### Step 3.1: Deploy Backend & Database to Render

1. Log into [dashboard.render.com](https://dashboard.render.com/) with GitHub.
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Choose the repository: `alok-108/subsight`.
4. Render detects the root [`render.yaml`](./render.yaml) file:
   - **`subsight-db`**: Creates free managed PostgreSQL in Singapore region.
   - **`subsight-api`**: Creates free web service in Singapore region with Python runtime.
5. Click **Apply Blueprint**.
6. Wait 2–3 minutes for:
   - Database provisioning to complete.
   - Python dependencies (`requirements.txt`) to install.
   - Web service to launch and pass the `/api/health` health check.
7. Note your public backend URL: `https://<service-name>.onrender.com`.

### Step 3.2: Optional Cloudflare R2 Bucket Setup

1. Open [dash.cloudflare.com](https://dash.cloudflare.com/) and navigate to **Storage & Databases** → **R2 Object Storage**.
2. Click **Create bucket**:
   - Bucket Name: `subsight-uploads`
   - Location: Automatic
3. Click **Manage R2 API Tokens** → **Create API Token**:
   - Permissions: **Object Read & Write**
   - Bucket Scope: Specific bucket (`subsight-uploads`)
4. In Render Dashboard → `subsight-api` → **Environment**, set:
   ```env
   STORAGE_BACKEND=r2
   R2_ACCOUNT_ID=<your-cf-account-id>
   R2_ACCESS_KEY_ID=<your-token-access-key>
   R2_SECRET_ACCESS_KEY=<your-token-secret-key>
   R2_BUCKET=subsight-uploads
   ```
   *(If skipped, the backend defaults to `STORAGE_BACKEND=local` seamlessly).*

### Step 3.3: Deploy Frontend to Vercel

1. Log into [vercel.com](https://vercel.com/) with GitHub.
2. Click **Add New...** → **Project**.
3. Import `alok-108/subsight`.
4. In the Project Configuration:
   - **Framework Preset:** Next.js
   - **Root Directory:** Edit and set to `frontend`
   - **Build Command:** `npm run build` (or Next.js default)
   - **Output Directory:** `.next` (default)
5. Expand **Environment Variables** and add:
   - **Name:** `NEXT_PUBLIC_API_BASE_URL`
   - **Value:** `https://<your-render-backend>.onrender.com` (no trailing slash)
6. Click **Deploy**.
7. Vercel will build and assign an HTTPS URL (e.g. `https://subsight.vercel.app`).

### Step 3.4: Wire Up CORS on Render

1. Return to Render Dashboard → `subsight-api` → **Environment**.
2. Update `ALLOWED_ORIGINS` to include your Vercel production domain:
   ```env
   ALLOWED_ORIGINS=https://subsight-app.vercel.app,http://localhost:3000
   ```
3. Click **Save Changes** (Render will automatically re-deploy in ~30 seconds).

### Step 3.5: Seed Demo Data

Once the backend is live, populate the live database with initial demo data:
```bash
curl -X POST https://<your-render-backend>.onrender.com/api/demo/seed
```
Expected response:
```json
{"status": "ok", "message": "Demo data seeded successfully", "transactions_count": 142, "subscriptions_count": 12}
```

### Step 3.6: Configure Keep-Alive Heartbeat

Free-tier Render web services spin down after 15 minutes of inactivity. To prevent cold starts (50s lag):
1. Sign up for a free account at [cron-job.org](https://cron-job.org/).
2. Click **Create Cronjob**:
   - **Title:** `SUBSIGHT Backend Keep-Alive`
   - **URL:** `https://<your-render-backend>.onrender.com/api/health`
   - **Execution Schedule:** Every 10 minutes (`*/10 * * * *`)
   - **Request Method:** `GET`
3. Save. cron-job.org will ping the health endpoint continuously, keeping the instance warm.

---

## 4. Rollback and Disaster Recovery

### Backend Rollback
- In Render Dashboard → `subsight-api` → **Deploys**.
- Select the previous successful commit or release.
- Click **Rollback to this deploy**.

### Database Reset
- If corrupt transactions or erroneous data are uploaded during a demo:
  ```bash
  curl -X POST https://<your-render-backend>.onrender.com/api/demo/reset
  curl -X POST https://<your-render-backend>.onrender.com/api/demo/seed
  ```
- This restores clean, pristine state within 1 second without restarting containers.

### Frontend Rollback
- In Vercel Dashboard → Project → **Deployments**.
- Find the previous passing deployment.
- Click the three dots `...` → **Promote to Production**.

---

## 5. Demo-Day Pre-Flight Checklist

Run through this checklist 15 minutes prior to any live presentation:

- [ ] **1. Ping Backend Health:**
  ```bash
  curl -i https://subsight-api-v2.onrender.com/api/health
  # Must return HTTP 200 with {"status":"ok","database":"connected"}
  ```
- [ ] **2. Warm Up Instance:**
  - Render free instances take ~40 seconds if cold. Visit [https://subsight-api-v2.onrender.com/api/health](https://subsight-api-v2.onrender.com/api/health) once before presenting.
- [ ] **3. Verify CORS Header:**
  ```bash
  curl -I -X OPTIONS https://subsight-api-v2.onrender.com/api/dashboard \
    -H "Origin: https://subsight-app.vercel.app" \
    -H "Access-Control-Request-Method: GET"
  # Must return Access-Control-Allow-Origin: https://subsight-app.vercel.app
  ```
- [ ] **4. Verify Frontend Screens:**
  - [ ] [`/`](https://subsight-app.vercel.app/) — Dashboard: Metrics display Total Monthly Spend, Active Count, Potential Savings, and charts load.
  - [ ] [`/subscriptions`](https://subsight-app.vercel.app/subscriptions) — Table lists detected subscriptions with confidence badges.
  - [ ] [`/forgotten`](https://subsight-app.vercel.app/forgotten) — Forgotten subscription candidates appear with "Keep" / "Cancel" buttons.
  - [ ] [`/transactions`](https://subsight-app.vercel.app/transactions) — Paginated transaction ledger displays categories and amounts.
  - [ ] [`/insights`](https://subsight-app.vercel.app/insights) — Monthly spend forecast and category breakdown render correctly.
  - [ ] [`/upload`](https://subsight-app.vercel.app/upload) — Upload dropzone accepts CSV statement and processes pipeline stages.
  - [ ] [`/how-it-works`](https://subsight-app.vercel.app/how-it-works) — Interactive explanation tabs and architecture diagram render.
- [ ] **5. Reset Data to Clean Baseline:**
  ```bash
  curl -X POST https://subsight-api-v2.onrender.com/api/demo/reset
  curl -X POST https://subsight-api-v2.onrender.com/api/demo/seed
  ```
- [ ] **6. Offline Backup:**
  - Keep `backend/app/seed/demo_transactions.csv` accessible on local desktop in case of live statement upload demonstration.
