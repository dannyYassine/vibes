---
type: Architecture
title: Infrastructure Layer
description: Django ORM models, repository implementations, RBC scraper, and background jobs.
tags: [infrastructure, orm, scraper, jobs]
timestamp: 2026-07-23T12:00:00Z
---

# Infrastructure Layer

## Location
`budget/budget/infrastructure/`

## Dependency Rule
May import: application + domain + Django + Playwright. Not imported by domain/application/services.

## Sub-packages

### `models/`
One file per ORM model:
- `category.py` — `CategoryModel` — ORM for Category entity
- `category_rule.py` — `CategoryRuleModel` — ORM for CategoryRule entity
- `transaction.py` — `TransactionModel` — ORM for Transaction entity

### `repositories/`
One file per repository implementation:
- `django_category.py` — `DjangoCategoryRepository` — get, list_all
- `django_category_rule.py` — `DjangoCategoryRuleRepository` — find_by_match_key, save, increment_confirmed, all_rules
- `django_transaction.py` — `DjangoTransactionRepository` — save, get, list_pending, list_for_month, update_category, exists

### `rbc/`
- `PlaywrightRBCScraper` — browser automation
- `csv_parser.py` — CSV → dict pipeline

### `jobs/`
- `sync_job.py` — scheduled + on-demand sync tasks
- `schedule.py` — Django-Q2 cron registration

## Key Design Decisions
- ORM models have `Meta.db_table` prefixed with `budget_` to avoid collisions
- `fromDatabase(row)` in domain entities keeps ORM knowledge out of domain
- Lazy string imports in DI container keep infrastructure out of import chain