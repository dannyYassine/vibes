---
type: External Communication
title: Categorization Completed
description: Event published after auto-categorization run completes.
tags: [external-comm, event, categorization]
timestamp: 2026-07-24T12:00:00Z
---

# Categorization Completed

## Direction
outbound

## Trigger
Auto-categorize use case finishes processing all pending transactions

## Schema
| Field | Type | Description |
|---|---|---|
| auto_approved | integer | Count of transactions auto-approved |
| queued | integer | Count sent to review queue |
| completed_at | datetime | When categorization finished |

## Handlers / Consumers
- Dashboard — refreshes summary if currently displayed

## Links
- [Use Case](use-case.md)