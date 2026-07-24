---
type: Architecture
title: Services Layer
description: Business logic services — CategorizationService and SummaryService.
tags: [services, categorization, summary]
timestamp: 2026-07-23T12:00:00Z
---

# Services Layer

## Location
`budget/budget/services/`

## Dependency Rule
May import: application (ports, matching handlers) + domain + stdlib.

## Files

### `categorization_service.py`
- `CategorizationService(tx_repo, rule_repo, cat_repo)`
- `build_new_transaction(raw: dict) -> Transaction` — normalizes description, creates pending tx
- `auto_categorize_pending() -> AutoCategorizeResult` — match pending vs rules, auto-approve matches
- `reinforce_rule(normalized_key, category_id) -> bool` — create or increment CategoryRule

### `summary_service.py`
- `SummaryService(tx_repo, cat_repo)`
- `build(year, month) -> MonthlySummary` — aggregate transactions by month, compute category totals

## Key Design Decisions
- Services are stateful wrappers around repo references — `providers.Singleton` in DI
- `auto_categorize_pending()` uses local dicts for rules/categories (loaded once per call)
- `reinforce_rule` returns `bool` — True if rule already existed (incremented), False if created