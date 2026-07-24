---
type: Use Case
title: Auto Categorize
description: Match pending transactions against existing category rules.
tags: [auto-categorize, matching, rules]
timestamp: 2026-07-23T12:00:00Z
---

# Auto Categorize

## Input
`AutoCategorizeDto()` (no params)

## Calls
- [Categorization Service](/architecture/services-layer.md)

## Output
`AutoCategorizeResult(auto_approved, queued)`

## Notes
- `AUTO_APPROVE_THRESHOLD = 1` — single match auto-approves
- Transactions with no match stay `"pending"` in review queue

## See Also
- [Transaction Sync](/features/transaction-sync/index.md) — triggers this use case after sync