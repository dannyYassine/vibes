---
type: Job
title: Daily Sync
description: Scheduled Django-Q2 job that syncs RBC transactions every morning at 6am.
tags: [job, sync, cron, q2]
timestamp: 2026-07-23T12:00:00Z
---

# Daily Sync

## Source
`budget/budget/infrastructure/jobs/sync_job.py`

## Schedule
- Cron: `0 6 * * *` (6am daily)
- Registered idempotently in `schedule.py`

## Functions

### `run_scheduled_sync()`
- Triggered by cron
- Syncs last 7 days (safety overlap to catch late-posting transactions)
- Uses `@inject` to receive `SyncTransactionsUseCase` from DI container

### `run_sync_now(sync_since=None)`
- Triggered by HTMX "Sync now" button
- Syncs last 30 days by default
- Fire-and-forget via `async_task`

### `_run_sync_task(sync_since)`
- Worker body executed by Django-Q2
- Uses `@inject` for use case resolution

## Links
- [Use Case](use-case.md)
- [Endpoint](endpoint.md)
- [External Communications](external-communications.md)