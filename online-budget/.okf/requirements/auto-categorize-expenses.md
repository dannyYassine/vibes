---
type: Requirement
title: Auto Categorize Expenses
description: Transactions are automatically categorized based on merchant patterns.
tags: [requirement, categorization]
timestamp: 2026-07-24T12:00:00Z
---

# Auto Categorize Expenses

## Description
As a user, I want transactions to be categorized automatically based on past patterns so I don't have to assign categories manually.

## Acceptance Criteria
1. Transactions matching an existing rule are auto-categorized
2. Single-match transactions are auto-approved without review
3. Multiple-match transactions go to review queue
4. No-match transactions stay pending for manual categorization

## Priority
high

## Stakeholder
End user

## Features
- [Categorization Engine](/features/categorization-engine/index.md)