---
type: API Endpoint
title: Dashboard
description: Main dashboard page showing monthly summary.
tags: [endpoint, dashboard, get]
timestamp: 2026-07-23T12:00:00Z
---

# Dashboard

## Route
`GET /` — `DashboardView.as_view()`

## Auth
`LoginRequiredMixin`

## Flow
1. Build `GetMonthlySummaryDto(year=today.year, month=today.month)`
2. Execute `GetMonthlySummaryUseCase`
3. Present result via `DashboardPresenter`
4. Render `dashboard.html` with `MonthlySummaryVM`

## Links
- [Use Case](./use-case.md)