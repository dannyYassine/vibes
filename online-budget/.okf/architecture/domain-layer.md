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

### `value_objects.py`
- `Money` — frozen dataclass, `Decimal amount`, `from_str()`, `is_credit`
- `NormalizedTitle` — frozen dataclass, `str value`
- `TransactionDate` — frozen dataclass, `str value` (ISO YYYY-MM-DD)

### `entities.py`
- `Category` — `id`, `name`, `color`, `fromDatabase(row)`
- `CategoryRule` — `id`, `match_key`, `category_id`, `times_confirmed`, `fromDatabase(row)`
- `Transaction` — `id`, `rbc_transaction_id`, `posted_date`, `description_raw`, `description_normalized`, `amount: Money`, `category: Optional[Category]`, `categorization_status`, `approved_at`, `fromDatabase(row)`
- `MonthlySummary` — `year`, `month`, `total_income`, `total_expense`, `categories`
- `CategoryTotal` — `category`, `amount`, `percentage`

### `exceptions.py`
- `BudgetError` (base)
- `CategoryNotFound`
- `RuleConflict`
- `SyncFailed`
- `RBCLoginError`

## Key Design Decisions
- `fromDatabase(row)` classmethods hydrate entities from Django ORM rows — keeps domain unaware of ORM
- `Money` uses `Decimal` not `float` — financial precision
- Entity `id` is `Optional[int]` — `None` means not persisted