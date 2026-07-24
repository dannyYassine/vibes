---
type: Domain Entity
title: Category Rule
description: Maps a normalized transaction description to a category for auto-categorization.
tags: [data-model, category-rule, domain, matching]
timestamp: 2026-07-23T12:00:00Z
---

# Category Rule

## Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `Optional[int]` | None = not persisted |
| `match_key` | `str` | Normalized title to match against |
| `category_id` | `int` | FK to Category |
| `times_confirmed` | `int` | Count of approvals reinforcing this rule |

## Domain File
`budget/budget/domain/entities/category_rule.py`

## ORM Schema

| Column | Type | Constraints |
|---|---|---|
| `id` | BigAutoField | PK |
| `match_key` | CharField(200) | unique, db_index |
| `category_id` | ForeignKey(CategoryModel) | PROTECT |
| `times_confirmed` | PositiveIntegerField | default 0 |
| `created_at` | DateTimeField | auto_now_add |
| `updated_at` | DateTimeField | auto_now |

## Django Model
`budget.budget.infrastructure.models.CategoryRuleModel`

## Used By
- [Categorization Engine](/features/categorization-engine/index.md)
- [Review Queue](/features/review-queue/index.md)