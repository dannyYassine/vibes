---
type: Requirement
title: Sync Transactions From Bank
description: User's bank transactions auto-sync from RBC without manual CSV downloads.
tags: [requirement, sync]
timestamp: 2026-07-24T12:00:00Z
---

# Sync Transactions From Bank

## Description
As a user, I want my RBC chequing transactions to appear in the app automatically so I don't have to manually download and upload CSV files.

## Acceptance Criteria
1. Daily sync runs at 6am without user action
2. Sync catches all transactions from last 7 days
3. User can trigger manual sync via "Sync Now" button
4. Failed sync sends notification to user
5. Duplicate transactions are never created

## Priority
critical

## Stakeholder
End user

## Features
- [Transaction Sync](/features/transaction-sync/index.md)