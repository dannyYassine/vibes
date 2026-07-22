# Django Clean Architecture

Server-Side HTML apps with clean architecture, MVP presentation pattern, and django-components.

## When to Use

When building Django apps with server-rendered HTML (no JSON APIs, no client-side state management). The server owns all state and logic; the browser just renders.

## Architecture

Django maps clean architecture layers to a Django package structure:

```
app/
├── domain/                # entities.py, exceptions.py — pure Python
├── application/           # ports.py (abstract repos), use_cases.py — no framework imports
├── infrastructure/        # django_models.py, repositories.py — ORM + port implementations
└── interfaces/            # views.py, presenters.py, components/ — wires everything
```

Dependency direction: `interfaces → application → domain`. Infrastructure implements application ports.

## Key Concepts

| Concept | Reference |
|---|---|
| Views (root + fragment) | `layers/views.md` |
| MVP Pattern (server-side) | `layers/mvp.md` |
| Presenters | `layers/presenters.md` |
| ViewModels | `layers/view-models.md` |
| Components | `layers/components.md` |

## Full Reference

Detailed walkthrough with code examples: `frameworks/django/django-clean-architecture.html` (open in browser)
