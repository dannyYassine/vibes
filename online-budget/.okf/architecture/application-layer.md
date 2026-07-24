---
type: Architecture
title: Application Layer
description: Ports (ABCs), DTOs, use cases, and matching handlers. Zero Django imports.
tags: [application, ports, use-cases, matching]
timestamp: 2026-07-23T12:00:00Z
---

# Application Layer

## Location
`budget/budget/application/`

## Dependency Rule
May import: domain + stdlib only. No Django, no services, no infrastructure.

## Sub-packages

### `ports/`
Abstract base classes defining repository and scraper contracts — one file per port:
- `transaction_repository.py` — `TransactionRepository`
- `category_rule_repository.py` — `CategoryRuleRepository`
- `category_repository.py` — `CategoryRepository`
- `rbc_scraper.py` — `RBCScraper`

### `dtos/`
Data transfer objects — one file per DTO:
- `sync_transactions.py` — `SyncTransactionsDto(sync_since: date)`
- `auto_categorize.py` — `AutoCategorizeDto()`
- `approve_categorization.py` — `ApproveCategorizationDto(transaction_id, category_id)`
- `get_monthly_summary.py` — `GetMonthlySummaryDto(year, month)`
- `get_review_queue.py` — `GetReviewQueueDto()`

### `matching/`
- `normalizer.py` — `normalize()` (v1: lowercased identity), `normalize_strict()` (production-ready)
- `exact_matcher.py` — `match()`: dict lookup by `NormalizedTitle.value`

### `use_cases/`
One file per use case + one per result type:
- `sync_result.py` — `SyncResult(new_count, skipped_count, errors: list)`
- `sync_transactions.py` — `SyncTransactionsUseCase` — scrape + dedup + save + auto-categorize
- `auto_categorize_result.py` — `AutoCategorizeResult(auto_approved, queued)`
- `auto_categorize.py` — `AutoCategorizeUseCase` — match pending transactions against rules
- `approve_result.py` — `ApproveResult(transaction, rule_reinforced)`
- `approve_categorization.py` — `ApproveCategorizationUseCase` — manual approve + reinforce rule
- `get_monthly_summary.py` — `GetMonthlySummaryUseCase` — aggregated monthly totals
- `get_review_queue.py` — `GetReviewQueueUseCase` — pending transactions + all categories

## Key Design Decisions
- `AUTO_APPROVE_THRESHOLD = 1` — class attribute on `AutoCategorizeUseCase`, not Django setting
- `@inject` is delivery-mechanism only — never used in application layer