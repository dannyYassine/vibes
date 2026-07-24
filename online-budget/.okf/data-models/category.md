---
type: Domain Entity
title: Category
description: Spending category used to classify transactions.
tags: [data-model, category, domain]
timestamp: 2026-07-23T12:00:00Z
---

# Category

## Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `Optional[int]` | None = not persisted |
| `name` | `str` | e.g. "Coffee", "Groceries" |
| `color` | `str` | Hex color, default `#999999` |

## Domain File
`budget/budget/domain/entities.py`

## ORM Schema

| Column | Type | Constraints |
|---|---|---|
| `id` | BigAutoField | PK |
| `name` | CharField(80) | unique |
| `color` | CharField(7) | default #999999 |

## Django Model
`budget.budget.infrastructure.django_models.CategoryModel`