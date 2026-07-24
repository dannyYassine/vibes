---
type: API Endpoint
title: Review Queue
description: HTMX fragment showing pending uncategorized transactions.
tags: [endpoint, review, get]
timestamp: 2026-07-23T12:00:00Z
---

# Review Queue

## Route
`GET /review/` — `ReviewQueueView.as_view()`

## Auth
`LoginRequiredMixin`

## Flow
1. Execute `GetReviewQueueUseCase`
2. Present via `ReviewQueuePresenter` → returns `ReviewQueueComponent`
3. Render via `component.render_to_response(request)`

## Template
`components/templates/review_queue.html`

## Links
- [Get Review Queue](/use-cases/get-review-queue.md)