---
type: External Communication
title: Sync Failure Alert
description: Notification sent when daily bank sync fails after retries.
tags: [external-comm, alert, sync, email]
timestamp: 2026-07-24T12:00:00Z
---

# Sync Failure Alert

## Direction
outbound

## Trigger
Daily sync job fails after 3 retries

## Schema
| Field | Type | Description |
|---|---|---|
| user_email | string | Recipient address |
| failed_at | datetime | When sync failed |
| error_message | string | Truncated error reason |

## Handlers / Consumers
- Email sender — notifies app admin

## Links
- [Job](job.md)
- [Use Case](use-case.md)