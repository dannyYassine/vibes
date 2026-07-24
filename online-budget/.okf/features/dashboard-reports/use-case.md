---
type: Use Case
title: Get Monthly Summary
description: Aggregate transactions by month with category breakdown.
tags: [summary, dashboard, monthly]
timestamp: 2026-07-23T12:00:00Z
---

# Get Monthly Summary

## Input
`GetMonthlySummaryDto(year, month)`

## Calls
- [Summary Service](/architecture/services-layer.md)

## Output
`MonthlySummary(year, month, total_income, total_expense, categories: list[CategoryTotal])`