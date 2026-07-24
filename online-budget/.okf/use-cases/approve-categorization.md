---
type: Use Case
title: Approve Categorization
description: Manually approve a categorization and reinforce the matching rule.
tags: [approve, review, categorization]
timestamp: 2026-07-23T12:00:00Z
---

# Approve Categorization

## Input
`ApproveCategorizationDto(transaction_id, category_id)`

## Calls
- [Transaction Repository](/data-models/transaction.md)
- [Category Rule Repository](/data-models/category-rule.md)
- [Categorization Service](/architecture/services-layer.md)

## Output
`ApproveResult(transaction, rule_reinforced: bool)`

## Flow
1. Update transaction category + status = `"manual"`
2. Call `categorizer.reinforce_rule()` — creates or increments CategoryRule