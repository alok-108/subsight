# SUBSIGHT — Intelligent Subscription & Recurring Payment Detection Engine

SUBSIGHT is an intelligent, privacy-first personal-finance prototype that ingests raw transaction statements (CSV & PDF), normalizes messy merchant descriptions, deterministically detects recurring payments, identifies candidate subscriptions, surfaces *potentially forgotten* recurring commitments, and generates rich financial burden insights.

---

## 🚀 Quickstart (One-Command Boot)

### On Windows (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

### On macOS / Linux / WSL / Bash:
```bash
make dev
# or
./scripts/dev.sh
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend:** [http://localhost:8000](http://localhost:8000)
- **Interactive OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

*Note: On first startup, the database (`backend/app/data/subsight.db`) is automatically initialized and seeded with synthetic demo data.*

---

## 🎯 The 3-Minute Hackathon Demo Script

1. **Dashboard (`/`)**:
   - Inspect active recurring spend (e.g. ₹6,396/month, ₹76,752/year), active subscription counts, and review-flagged count.
   - Explore the 4 live charts: Monthly Spend Area, Category Donut, Highest Costs Bar, and 12-Month Trend.
2. **Upload & Analyze (`/upload`)**:
   - Drag and drop `backend/app/seed/demo_transactions.csv` into the dropzone.
   - Observe the instant preview showing extracted rows, dates, and amounts.
   - Click **"Analyze Transactions"** to watch the live 7-step engine trace complete with real execution timings.
3. **Subscriptions (`/subscriptions`)**:
   - Review detected subscriptions (Netflix, Spotify, Google One, Cult.fit, Adobe, Cloud Storage, Amazon Prime, Zomato Gold, iCloud+).
   - Filter by status, search by merchant, or sort by monthly burden.
4. **Subscription Details (`/subscriptions/{id}`)**:
   - Open **Cloud Storage** to inspect the payment timeline and see the price step jump from ₹499 to ₹549.
   - Examine the interval scatter plot comparing day deltas against the median line.
5. **Potentially Forgotten (`/forgotten`)**:
   - Explain the heuristic banner.
   - Inspect **Cult.fit** or **Adobe Creative Cloud** — read the exact, factual, data-derived strings in the "Why Flagged" block.
   - Click **"Keep"** on Cult.fit to verify immediate review-flag clearance and persistence.
6. **Financial Insights (`/insights`)**:
   - View the annual subscription burden, highest expenses, potential monthly savings, and narrative explanations.
7. **Settings (`/settings`)**:
   - Toggle theme (Light / Dark / System), switch profiles via the topbar, review the privacy stance, or test the "Delete Uploaded Data" flow.
8. **How It Works (`/how-it-works`)**:
   - Walk through the visual end-to-end pipeline, the core heuristic formula blocks, and the signal weighting model.

---

## 🧠 Algorithmic Detection Architecture

SUBSIGHT uses a multi-stage, purely deterministic pipeline (no probabilistic LLM hallucinations or brittle card scrapers):

1. **Statement Ingestion & Deduplication**:
   - Ingests CSV and PDF statements via flexible header aliasing (`Narration|Particulars|Merchant -> merchant`, `Debit|Withdrawal|Amount -> amount`).
   - Deduplicates identical records using SHA-256 keys of `(user_id, date, merchant_clean, amount, direction)`.
2. **Merchant Normalization & Aliasing**:
   - Cleans noise tokens (`POS, UPI, IMPS, NEFT, ACH, TXN, REF, PVT, LTD, *12345`).
   - Strips trailing Indian city names (`MUMBAI, BENGALURU, DELHI, PUNE, CHENNAI`).
   - Maps strings through alias dictionaries and token-set fuzzy matching (threshold ≥ 0.85).
3. **Adaptive Amount Clustering & Price-Revision Merging**:
   - Clusters transaction amounts with tolerance `max(20.0, 0.05 × median)`.
   - Automatically merges adjacent chronological runs with stepped increases ≤ 25% (e.g. ₹499 → ₹549).
4. **Cadence Delta Analysis**:
   - Computes day deltas between consecutive transactions:
     - Weekly (5–9 days)
     - Monthly (25–35 days)
     - Quarterly (80–100 days)
     - Yearly (350–380 days)
   - Tolerates single skipped payments (up to 2.2× median interval) without breaking the pattern.
5. **Composite Confidence Scoring (0.0 to 1.0)**:
   $$\text{Confidence} = 0.35 \times \text{Interval} + 0.25 \times \text{Amount} + 0.20 \times \text{Count} + 0.10 \times \text{Merchant} + 0.10 \times \text{Recency}$$
   - **High (≥ 0.80)**
   - **Medium (0.62 – 0.79)**
   - **Low (0.45 – 0.61)**
   - **Below 0.45**: Excluded from subscriptions (marked non-recurring).
6. **Review / Forgotten Flag**:
   - Set when confidence ≥ 0.62, status is active, tenure ≥ 6 months (or annual renewal within 30 days), and unconfirmed.
   - Strictly outputs factual, neutral statements (e.g. *"Recurring payment detected for 8 consecutive months."*) — never declaring a user forgot.

---

## 🔒 Privacy & Synthetic Stance

> **Your financial data is sensitive. Use only data you are comfortable uploading.**

- **Zero Bank Credentials**: No Plaid, no scraping, no card numbers, no credentials stored.
- **100% Synthetic Indian Demo Data**: Includes 12 synthetic profiles across North, South, East, and West regions (Aarav Sharma, Priya Verma, Arjun Nair, etc.).
- **Local Persistence**: Runs on a local SQLite database (`backend/app/data/subsight.db`).
- **Data Erasure**: Users can purge uploaded statements and derived transactions at any time from Settings.

---

## 🧪 Testing

Run backend test suite covering all detection edge cases:
```bash
cd backend
$env:PYTHONPATH="." ; .\venv\Scripts\python -m pytest tests -v
```
Or via make:
```bash
make test
```
