---
type: Architecture
title: Testing Strategy
description: Unit, integration, and functional test organization for the budget app.
tags: [testing, pytest, strategy]
timestamp: 2026-07-23T12:00:00Z
---

# Testing Strategy

## Directory Structure
```
tests/
├── unit/           # No DB — handlers, presenters, VMs, normalizers
├── integration/    # DB needed — use cases, repos, services
└── functional/     # Full stack — views via Django test client
```

## Test Matrix

| Layer | Test Type | Fixtures | Speed |
|---|---|---|---|
| Normalizer | Unit | None | Instant |
| ExactMatcher | Unit | None | Instant |
| Presenters | Unit | None | Instant |
| ViewModels | Unit | None | Instant |
| Use Cases | Integration | `db`, `container` | Fast |
| Repositories | Integration | `db` | Fast |
| Views | Functional | `db`, `client_logged` | Medium |

## Key Fixtures (conftest.py)
- `container(db)` — wired DI container
- `user(db)` — Django User
- `client_logged(client, user)` — authenticated test client

## Running
```bash
# Unit tests (no DB, fast)
docker compose exec web pytest tests/unit -q

# Full suite
docker compose exec web pytest -q
```

## Rules
- Never hit live RBC in tests — mock `RBCScraper`
- Use factory-boy for test data where possible
- Every use case gets one integration test (happy path)
- Every view gets one functional test (status code + content)