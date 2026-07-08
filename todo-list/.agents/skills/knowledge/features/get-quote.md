---
type: Feature
title: Get Quote
description: Fetch a random inspirational quote — displayed at bottom of todo list. External API call with anyhow error handling.
tags: [quote, backend, frontend, feature, external-api]
timestamp: 2026-07-08T12:00:00Z
---

# Get Quote

## Description

On mount, the app fetches a random quote from an external API (`zenquotes.io`) and displays it below the todo list. Failures are logged and silently swallowed (quote section hidden).

## Products

- [Backend API](/products/backend-api.md) — `GET /api/quote`, `GetQuoteUseCase` → `QuoteService.get_random()` → `ExternalQuoteRepository.get_random()` (HTTP GET to `zenquotes.io`)
- [Frontend App](/products/frontend-app.md) — `TodoView.tsx` quote section → `TodoPresenter.loadQuote()` → `QuoteService.getRandomQuote()` → `QuoteRepository.getRandom()` → `QuoteDataSource.fetchQuote()`

## Flow

1. `TodoPresenter.onMounted()` calls `loadQuote()` in parallel with `loadTodos()`
2. `QuoteService.getRandomQuote()` → `QuoteRepository.getRandom()` → `QuoteDataSource.fetchQuote()` sends `GET /api/quote`
3. Backend `GET /api/quote` handler → `GetQuoteUseCase` → `QuoteService.get_random()` → `ExternalQuoteRepository.get_random()` fetches from `https://zenquotes.io/api/random`
4. External API returns `[{ q: string, a: string }]` — mapped via `ZenQuoteDto` → `Quote { content: q, author: a }`
5. Backend returns `Json<QuoteResponse>` with `content` + `author`
6. Frontend maps `QuoteDto` → `Quote` entity → stored in presenter state as `{ content, author }`
7. `TodoView` renders quote in italic `<p>` at bottom: `"<content>" — <author>`

## Error Handling

| Layer | Behavior |
|-------|----------|
| Repository (`ExternalQuoteRepository`) | `anyhow::Result` — `?` propagates reqwest HTTP/JSON errors with context |
| Usecase + Service | Propagates via `anyhow::Result` |
| Handler | Logs error with `eprintln!("get_quote failed: {e:?}")`, returns `500` |
| Presenter (`loadQuote`) | Catches error, sets `quote: null` (quote section hidden) |

## Config

- `anyhow = "1"` — used for error propagation across quote chain
- `reqwest = { version = "0.12", features = ["json", "rustls-tls"] }` — HTTP client for external API

## Tests

- `todo.integration.test.ts` — `Quote feature` describe block tests `QuoteService.getRandomQuote()` with fake data source
- `TodoView.test.tsx` — `renders the quote when present` test

## Related

- [List Todos](/features/list-todos.md)

## Citations

[1] [OKF Specification v0.1](/references/okf-spec.md) — Frontmatter and cross-linking conventions