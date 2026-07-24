---
type: Architecture
title: Interface Layer
description: Presenters, view models, django-components, and views — the delivery mechanism.
tags: [interface, presenters, views, components, auth]
timestamp: 2026-07-23T12:00:00Z
---

# Interface Layer

## Location
`budget/budget/interfaces/`

## Dependency Rule
- Presenters may import: domain entities + view models only
- Views may import: `application/container`, `application/use_cases`, `interfaces/presenters`, `dependency_injector.wiring`, Django
- Components may import: django-components, templates

## Sub-packages

### `view_models/`
Data-only dataclasses — one file per VM:
- `category_total.py` — `CategoryTotalVM` — name, amount, percentage, badge_color
- `monthly_summary.py` — `MonthlySummaryVM` — month_label, total_income, total_expense, net, categories
- `category_option.py` — `CategoryOptionVM` — id, name
- `review_queue_item.py` — `ReviewQueueItemVM` — transaction_id, description, amount, date, category_options
- `review_queue.py` — `ReviewQueueVM` — items, empty
- `sync_result.py` — `SyncResultVM` — new_count, skipped_count, errors, message

### `presenters/`
- `_helpers.py` — `_money(amount)` shared formatting helper
- `dashboard.py` — `DashboardPresenter` — `MonthlySummary` → `MonthlySummaryVM`
- `review_queue.py` — `ReviewQueuePresenter` — `list[Transaction]`, `list[Category]` → `ReviewQueueVM`
- `sync_result.py` — `SyncResultPresenter` — `SyncResult` → `SyncResultVM`

### `components/`
- `SummaryCardComponent` — monthly summary card
- `ReviewRowComponent` — approval row with category selector
- `SyncButtonComponent` — HTMX sync trigger

### `views/`
- `dashboard` — `GET /` — renders dashboard with monthly summary
- `sync_now` — `POST /sync/` — triggers background sync
- `review_queue` — `GET /review/` — renders review queue fragment
- `approve` — `POST /review/<id>/approve/` — approves categorization

## Auth
- All views use `@login_required` decorator
- Django built-in auth (`LoginView`, `LogoutView`)
- Login template at `templates/registration/login.html`
- No signup flow (admin creates users)