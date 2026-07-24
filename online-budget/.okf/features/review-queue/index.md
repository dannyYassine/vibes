---
type: Feature
title: Review Queue
description: Review and approve pending uncategorized transactions.
tags: [feature, review, approval]
timestamp: 2026-07-24T12:00:00Z
---

# Review Queue

## Fulfills Requirements
- [Approve Questionable Items](/requirements/approve-questionable-items.md)

## Contents
- [Use Case: Get Review Queue](use-case.md) — fetch pending transactions
- [Use Case: Approve Categorization](use-case-2.md) — assign category and reinforce rule
- [Endpoint: Review Queue](endpoint.md) — GET /review/
- [Endpoint: Approve](endpoint-2.md) — POST /review/{id}/approve/

## Shared Models Used
- [Transaction](/shared/data-models/transaction.md)
- [Category](/shared/data-models/category.md)
- [Category Rule](/shared/data-models/category-rule.md)

## References
- [Categorization Service](/architecture/services-layer.md)