---
type: Feature
title: Transaction Sync
description: Automatically sync bank transactions from RBC daily via cron or manual trigger.
tags: [feature, sync, rbc]
timestamp: 2026-07-24T12:00:00Z
---

# Transaction Sync

## Fulfills Requirements
- [Sync Transactions From Bank](/requirements/sync-transactions-from-bank.md)

## Contents
- [Use Case](use-case.md) — sync flow
- [Endpoint](endpoint.md) — POST /sync/
- [Job](job.md) — daily 6am cron
- [External Communications](external-communications.md) — sync failure alerts

## Shared Models Used
- [Transaction](/shared/data-models/transaction.md)

## References
- [RBC Scraper](/shared/references/rbc-scraper.md)
- [CSV Parser](/shared/references/csv-parser.md)