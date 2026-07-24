---
type: API Endpoint
title: Approve Categorization
description: Approve a category assignment for a pending transaction.
tags: [endpoint, approve, post]
timestamp: 2026-07-23T12:00:00Z
---

# Approve Categorization

## Route
`POST /review/<tx_id>/approve/` — `ApproveView.as_view()`

## Auth
`LoginRequiredMixin` + `@method_decorator(require_POST)`

## Flow
1. Parse `category` from POST body
2. Execute `ApproveCategorizationUseCase`
3. Return empty `<tr></tr>` (row removed from DOM)

## Links
- [Approve Categorization](/use-cases/approve-categorization.md)