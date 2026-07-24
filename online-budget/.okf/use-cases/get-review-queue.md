---
type: Use Case
title: Get Review Queue
description: Fetch all pending (uncategorized) transactions and available categories.
tags: [review, queue, pending]
timestamp: 2026-07-23T12:00:00Z
---

# Get Review Queue

## Input
`GetReviewQueueDto()` (no params)

## Calls
- [Transaction Repository](/data-models/transaction.md)
- [Category Repository](/data-models/category.md)

## Output
`(pending: list[Transaction], categories: list[Category])`