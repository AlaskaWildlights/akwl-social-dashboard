# Alaska Wild Lights — Social Media Dashboard

Weekly performance tracker for Instagram, Facebook, and Google Analytics.
Built for the marketing team — Caitlin uploads CSVs, everything else runs automatically.

---

## How it works

```
Caitlin uploads CSVs to Google Drive folder
            ↓
Apps Script runs every Monday 9am Alaska time
            ↓
Google Sheet updates with new weekly data
            ↓
Email report sent automatically to the team
            ↓
Dashboard at GitHub Pages reflects new data on page load
```

---

## Files in this repo

| File | What it does |
|---|---|
| `index.html` | The live dashboard — opens in any browser, reads from Google Sheet |
| `Code.gs` | Google Apps Script — paste into Extensions → Apps Script in your Google Sheet |
| `README.md` | This file |

---

## Connect to live data

Open `index.html` and find the CONFIG block near the top of the script section:

```javascript
const CONFIG = {
  SHEET_ID: "YOUR_SHEET_ID_HERE",
  WEEKLY_GID: "0",
  LIVE_DATA: false
};
```

**Step 1** — In Google Sheets: File → Share → Publish to web → select the **Weekly** tab → format **CSV** → Publish. Copy the URL.

The URL looks like:
```
https://docs.google.com/spreadsheets/d/SHEET_ID/pub?gid=GID&single=true&output=csv
```

**Step 2** — Update CONFIG with your values:

```javascript
const CONFIG = {
  SHEET_ID: "1abc123yourRealSheetId",
  WEEKLY_GID: "123456789",
  LIVE_DATA: true
};
```

**Step 3** — Commit and push. Dashboard now loads live data.

---

## Apps Script setup (one time)

1. Open your Google Sheet
2. Extensions → Apps Script
3. Paste the full contents of `Code.gs`, replacing any existing code
4. Save (Ctrl+S)
5. Reload the Google Sheet — an **AKWL Tracker** menu appears in the menu bar
6. AKWL Tracker → **Procesar CSVs ahora** — first run, also triggers the permissions dialog
7. AKWL Tracker → **Crear trigger semanal** — sets up the Monday 11am AKST auto-run

After that, nothing needs to be touched. The script runs every Monday at 11am Alaska time, processes the CSVs, updates the Sheet, and saves a draft email in the Drafts folder of the account that authorized the script.

---

## Weekly workflow for Caitlin

1. Export CSVs from Instagram Insights and Facebook Insights (Sunday night or Monday morning before 11am)
2. Export Traffic Acquisition CSV from Google Analytics 4
3. Upload all files to the Google Drive folder `AKWL Social CSVs` (folder ID: `1G861p7ZUSpLhoFZjLDRPmUykN5QKXFEz`)
4. The script processes everything automatically at 11am AKST Monday and saves an email draft in Drafts

Files are automatically renamed after processing — e.g. `AKWL_Instagram_Reach_2026-W18.csv` — and moved to a `Processed/` subfolder inside the same folder.

---

## What the script processes

| CSV export | Platform | Where it comes from in Meta |
|---|---|---|
| Follows | Instagram | Business Suite → Insights → Followers |
| Reach | Instagram | Business Suite → Insights → Reach |
| Views | Instagram | Business Suite → Insights → Views |
| Profile Visits | Instagram | Business Suite → Insights → Profile visits |
| Link Clicks | Instagram | Business Suite → Insights → Link clicks |
| Content Interactions (2) | Instagram | Business Suite → Insights → Content interactions |
| Follows | Facebook | Business Suite → Insights → Followers |
| Visits | Facebook | Business Suite → Insights → Visits |
| Viewers | Facebook | Business Suite → Insights → Viewers |
| Content Interactions (1) | Facebook | Business Suite → Insights → Content interactions |
| Traffic Acquisition | Google Analytics | GA4 → Reports → Acquisition → Traffic acquisition |

The script identifies platform by the title inside each CSV. The GA export is identified by the `#` comment lines at the top of the file.

---

## Google Sheet tabs

| Tab | Contents | Updated by |
|---|---|---|
| `Instagram` | Daily metrics — one row per day | Apps Script |
| `Facebook` | Daily metrics — one row per day | Apps Script |
| `Google Analytics` | Sessions and revenue by source and date range | Apps Script |
| `Weekly` | Aggregated weekly totals — what the dashboard reads | Apps Script |

---

## Weekly email draft

Every Monday at 11am AKST, after processing the CSVs, the script creates a **draft** in the Gmail Drafts folder of `info@alaskawildlights.com`. It is never sent automatically — a team member must review it and send manually.

The draft includes:

- Instagram: reach, views, follows, profile visits, link clicks, interactions, engagement rate
- Facebook: visits, viewers, follows, interactions
- Week-over-week deltas for all key metrics
- Two plain-language performance signals (e.g. "Reach dropped 40% — review posting frequency and content type")

Addressed to: `info@alaskawildlights.com` with CC to Kyle, Ashley, and Josh

> **Important:** The Google account that runs the Apps Script must be `info@alaskawildlights.com` or have Send As / delegate access to that inbox. Otherwise the draft will appear in the personal Gmail of whoever authorized the script.

---

## Dashboard features

- **Date range selector** — top right corner: Last 4 weeks / Last 8 weeks / All data. Filters all charts instantly without reloading.
- **Four tabs** — Overview, Instagram, Facebook, Google Analytics
- **Insight bars** — each tab has a plain-language interpretation of the numbers, not just the numbers
- **Week-over-week deltas** — every KPI card shows % change vs the previous week
- **Performance ranking** — Instagram tab ranks all weeks by reach with engagement rate side by side

---

## Team

| Person | Role |
|---|---|
| Caitlin Alexander | Uploads CSVs weekly, monitors dashboard |
| Saray | Google Sheet and Apps Script maintenance |
| Kyle Luetkehans | Revenue and booking attribution review |
| Josh Heath | Growth and partnerships context |

---

## Notes

- Dashboard shows April 2026 sample data until `LIVE_DATA: true` is set in CONFIG
- Facebook data is available from April 20, 2026 onward
- TikTok planned for July 1, 2026 — a new tab will be added to the script and dashboard at that time
- UTM booking attribution column is reserved in the Weekly sheet but shows $0 until FareHarbor exports are matched to social UTM sources
- Google Analytics export covers a date range, not daily data — the GA tab stores one block per export upload
