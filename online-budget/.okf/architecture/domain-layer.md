---
type: Architecture
title: Domain Layer
description: Pure Python domain entities, value objects, and exceptions. Zero framework imports.
tags: [domain, entities, clean-architecture]
timestamp: 2026-07-23T12:00:00Z
---

# Domain Layer

## Location
`budget/budget/domain/`

## Dependency Rule
stdlib only — no Django, no application, no services, no infrastructure imports.

## Files

### `value_objects/`
- `money.py` — `Money` frozen dataclass, `Decimal amount`, `from_str()`, `is_credit`
- `normalized_title.py` — `NormalizedTitle` frozen dataclass, `str value`
- `transaction_date.py` — `TransactionDate` frozen dataclass, `str value` (ISO YYYY-MM-DD)

### `entities/`
- `category.py` — `Category` dataclass, `id`, `name`, `color`, `fromDatabase(row)`
- `category_rule.py` — `CategoryRule` dataclass, `id`, `match_key`, `category_id`, `times_confirmed`, `fromDatabase(row)`
- `transaction.py` — `Transaction` dataclass, `id`, `rbc_transaction_id`, `posted_date`, `description_raw`, `description_normalized`, `amount: Money`, `category: Category | None`, `categorization_status`, `approved_at`, `fromDatabase(row)`
- `monthly_summary.py` — `MonthlySummary` dataclass, `year`, `month`, `total_income`, `total_expense`, `categories`
- `category_total.py` — `CategoryTotal` dataclass, `category`, `amount`, `percentage`

### `exceptions/`
- `budget_error.py` — `BudgetError` (base)
- `category_not_found.py` — `CategoryNotFound`
- `rule_conflict.py` — `RuleConflict`
- `sync_failed.py` — `SyncFailed`
- `rbc_login_error.py` — `RBCLoginError`

## Key Design Decisions
- `fromDatabase(row)` classmethods hydrate entities from Django ORM rows — keeps domain unaware of ORM
- `Money` uses `Decimal` not `float` — financial precision
- Entity `id` is `Optional[int]` — `None` means not persisted