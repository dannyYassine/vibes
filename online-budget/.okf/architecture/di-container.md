---
type: Architecture
title: DI Container
description: python-dependency-injector DeclarativeContainer wiring use cases, services, repos, and scraper.
tags: [di, container, dependency-injection]
timestamp: 2026-07-23T12:00:00Z
---

# DI Container

## Location
`budget/budget/application/container.py`

## Technology
[python-dependency-injector](https://github.com/ets-labs/python-dependency-injector) — `DeclarativeContainer`

## Wiring Pattern

| Scope | Provider Type | Examples |
|---|---|---|
| Singleton | `providers.Singleton` | Repositories, scraper, services |
| Transient | `providers.Factory` | All 5 use cases |

## Lazy Imports
Infrastructure classes use string-based providers (e.g. `"budget.budget.infrastructure.repositories.DjangoTransactionRepository"`) so the container can be imported without pulling Django into the application layer. Actual imports resolve at first call time via dependency-injector's string-import feature.

## @inject Rule
`@inject` + `Provide[Container.xxx]` is used **only at the delivery mechanism layer** (views, jobs). Use cases, services, repos receive dependencies via constructor parameters from the container.

## Registered Providers

### Infrastructure (lazy string imports)
- `transaction_repo` → `DjangoTransactionRepository`
- `category_rule_repo` → `DjangoCategoryRuleRepository`
- `category_repo` → `DjangoCategoryRepository`
- `rbc_scraper` → `PlaywrightRBCScraper`

### Services
- `categorization_service` → `CategorizationService(tx_repo, rule_repo, cat_repo)`
- `summary_service` → `SummaryService(tx_repo, cat_repo)`

### Use Cases (Factory)
- `sync_usecase` → `SyncTransactionsUseCase(scraper, repo, categorizer)`
- `auto_categorize_usecase` → `AutoCategorizeUseCase(categorizer, repo)`
- `approve_usecase` → `ApproveCategorizationUseCase(tx_repo, rule_repo, categorizer)`
- `monthly_summary_usecase` → `GetMonthlySummaryUseCase(summary_service)`
- `review_queue_usecase` → `GetReviewQueueUseCase(tx_repo, cat_repo)`

## Wiring Registration
In `apps.py` `ready()`:
```python
Container.wire(modules=[
    "budget.budget.interfaces.views.dashboard",
    "budget.budget.interfaces.views.sync",
    "budget.budget.interfaces.views.review",
    "budget.budget.interfaces.views.approve",
    "budget.budget.infrastructure.jobs.sync_job",
])
```