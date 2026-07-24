---
type: Domain Entity
title: Transaction
description: Core transaction entity representing a single RBC account movement.
tags: [data-model, transaction, domain]
timestamp: 2026-07-23T12:00:00Z
---

# Transaction

## Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `Optional[int]` | None = not persisted |
| `rbc_transaction_id` | `str` | Dedup key: `{date}\|{desc}\|{amount}` |
| `posted_date` | `date` | From RBC CSV |
| `description_raw` | `str` | Original RBC description |
| `description_normalized` | `str` | After normalizer pass |
| `amount` | `Money` | Decimal, financial precision |
| `category` | `Optional[Category]` | Assigned or null |
| `categorization_status` | `str` | `"pending"` \| `"auto"` \| `"manual"` |
| `approved_at` | `Optional[str]` | ISO datetime when approved |

## Domain File
`budget/budget/domain/entities/transaction.py`

## ORM Schema

| Column | Type | Constraints |
|---|---|---|
| `id` | BigAutoField | PK |
| `rbc_transaction_id` | CharField(120) | unique |
| `posted_date` | DateField | db_index |
| `description_raw` | TextField | |
| `description_normalized` | CharField(200) | db_index |
| `amount` | DecimalField(10,2) | |
| `category_id` | ForeignKey(CategoryModel) | nullable, SET_NULL |
| `categorization_status` | CharField(10) | choices: pending/auto/manual |
| `approved_at` | DateTimeField | nullable |
| `imported_at` | DateTimeField | auto_now_add |

## Django Model
`budget.budget.infrastructure.models.TransactionModel`