---
type: Use Case
title: Sync Transactions
description: Pulls new transactions from RBC and auto-categorizes them.
tags: [sync, rbc, scraper]
timestamp: 2026-07-23T12:00:00Z
---

# Sync Transactions

## Input
`SyncTransactionsDto(sync_since: date)`

## Calls
- [RBC Scraper](/shared/references/rbc-scraper.md)
- [Transaction](/shared/data-models/transaction.md)
- [Categorization Service](/architecture/services-layer.md)

## Output
`SyncResult(new_count, skipped_count, errors)`

## Flow
1. Call `scraper.scrape(sync_since)` → list of raw dicts
2. For each raw dict: dedup by `rbc_transaction_id`, skip existing
3. Build Transaction via `categorizer.build_new_transaction(raw)`
4. Save via `repo.save(tx)`
5. Run `categorizer.auto_categorize_pending()`

## See Also
- [Categorization Engine](/features/categorization-engine/index.md) — chained after sync
- [External Communications](external-communications.md) — sync failure alerts