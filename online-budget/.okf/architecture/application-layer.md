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

### `ports.py`
Abstract base classes defining repository and scraper contracts:
- `TransactionRepository`
- `CategoryRuleRepository`
- `CategoryRepository`
- `RBCScraper`

### `dtos.py`
Data transfer objects — pure dataclasses:
- `SyncTransactionsDto(sync_since: date)`
- `AutoCategorizeDto()`
- `ApproveCategorizationDto(transaction_id, category_id)`
- `GetMonthlySummaryDto(year, month)`
- `GetReviewQueueDto()`

### `matching/`
- `normalizer.py` — `normalize()` (v1: lowercased identity), `normalize_strict()` (production-ready)
- `exact_matcher.py` — `match()`: dict lookup by `NormalizedTitle.value`

### `use_cases.py`
Five use cases:
- `SyncTransactionsUseCase` — scrape + dedup + save + auto-categorize
- `AutoCategorizeUseCase` — match pending transactions against rules
- `ApproveCategorizationUseCase` — manual approve + reinforce rule
- `GetMonthlySummaryUseCase` — aggregated monthly totals
- `GetReviewQueueUseCase` — pending transactions + all categories

## Key Design Decisions
- `AUTO_APPROVE_THRESHOLD = 1` — class attribute on `AutoCategorizeUseCase`, not Django setting
- `@inject` is delivery-mechanism only — never used in application layer