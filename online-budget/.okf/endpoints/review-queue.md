---
type: API Endpoint
title: Review Queue
description: HTMX fragment showing pending uncategorized transactions.
tags: [endpoint, review, get]
timestamp: 2026-07-23T12:00:00Z
---

# Review Queue

## Route
`GET /review/` — `review.review_queue`

## Auth
`@login_required`

## Flow
1. Execute `GetReviewQueueUseCase`
2. Present via `ReviewQueuePresenter`
3. Render `review_queue.html` fragment

## Links
- [Get Review Queue](/use-cases/get-review-queue.md)