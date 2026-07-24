---
type: Reference
title: RBC Scraper
description: Playwright-based browser automation to download RBC joint chequing CSV exports.
tags: [rbc, scraper, playwright, reference]
timestamp: 2026-07-23T12:00:00Z
---

# RBC Scraper

## Source
`budget/budget/infrastructure/rbc/scraper.py`

## Flow
1. Launch headless Chromium via Playwright
2. Navigate to RBC Online Banking
3. Fill username/password from env vars (`RBC_USERNAME`, `RBC_PASSWORD`)
4. Detect MFA challenge (raise `RBCLoginError` if present — manual login required first)
5. Wait for accounts table → click "Chequing" → click "Export"
6. Select CSV format, fill date range (`since` → today)
7. Download CSV file to `RBC_DOWNLOAD_DIR` (default: `/tmp/rbc_exports`)
8. Parse CSV via `csv_parser.parse_csv()` → return list of dicts

## Selectors
All CSS selectors in `selectors.py` — single file to patch when RBC changes UI.

## Credential Rules
- `RBC_USERNAME` and `RBC_PASSWORD` read from environment only
- Never hardcoded, never logged
- `.env` file is gitignored