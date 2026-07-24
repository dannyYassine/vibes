---
type: API Endpoint
title: Sync
description: Trigger background RBC transaction sync.
tags: [endpoint, sync, post]
timestamp: 2026-07-23T12:00:00Z
---

# Sync

## Route
`POST /sync/` — `SyncNowView.as_view()`

## Auth
`LoginRequiredMixin` + `@method_decorator(require_POST)`

## Flow
1. Call `run_sync_now()` (fire-and-forget via Django-Q2 async_task)
2. Return HTML toast message

## Links
- [Daily Sync](/jobs/daily-sync.md)