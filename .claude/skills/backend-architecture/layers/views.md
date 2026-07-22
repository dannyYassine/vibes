# Views

## Rule

The view is a **coordinator** — not the MVP "View." It parses the request, calls the use case, calls the presenter, and renders whatever comes back. Zero decisions.

## The 4-Step Job

Every view follows the same pattern:

1. **Parse** — extract input from the request (session key, form data, URL params)
2. **Call use case** — execute business logic, get output DTO
3. **Call presenter** — transform output into a configured component with view model
4. **Render** — return the component's HTTP response. No branching, no conditions.

```python
class CartView(View):
    def get(self, request):
        session_key = request.session.session_key                                    # 1. parse
        output = GetCartUseCase(cart_repo).execute(session_key)                      # 2. call use case
        component = CartPresenter().present(output)                                  # 3. present
        return component.render_to_response(request=request)                         # 4. render
```

## Root vs Fragment Views

| View type | Purpose | Pattern | PRG? |
|---|---|---|---|
| **Root view** | Full page HTML (initial load, form POST) | Parse → use case → presenter → full component → HTTP response | POST mutations redirect to GET |
| **Fragment view** | Partial HTML for HTMX swap | Parse → use case → presenter → component snippet → HTML fragment | No redirect — swap directly |

Root views follow the **Post / Redirect / Get** pattern: never render HTML after a POST. Mutate, redirect 303, then GET renders.

Fragment views skip the redirect. They return the component's HTML directly into the HTMX swap target. The architecture is identical — only the transport changes.

## What a View Does

- Parses request input (session, form, URL params)
- Calls a single use case
- Calls a single presenter
- Renders the returned component

## What a View Does Not Do

- Does not call services or repositories directly
- Does not call helpers or handlers
- Does not make decisions about which component to render (presenter owns that)
- Does not format data for display (presenter owns that)
- Does not contain business logic
- Does not branch on output state beyond error handling

## View as Coordinator

The framework's `View` class (Django, etc.) is the **coordinator**, not the MVP View. It wires the three MVP actors together:

```
Framework View (coordinator)
    │
    ├── Use Case      → business outcome → Output DTO
    ├── Presenter     → chooses component + builds ViewModel
    └── Component     → renders HTML (the real MVP View)
```

## Fragment Views with HTMX

Each HTMX endpoint is its own full stack — use case → presenter → component. Deep component nesting signals the need to split into independent endpoints.

```python
# Fragment view — same stack, different endpoint
class InventoryBadgeView(View):
    def get(self, request, product_id: int):
        output = GetInventoryUseCase(...).execute(product_id)
        component = InventoryPresenter().present(output)
        return component.render_to_response(request=request)
```

**Nesting decision tree:**

| Question | Yes | No |
|---|---|---|
| Is data already in scope from parent use case? | Nest the component | HTMX call |
| Is this component always visible on load? | Nest it | HTMX with `hx-trigger="revealed"` |
| Is fetching this data expensive? | HTMX call, show skeleton | Nest it |
| Is this a different domain concern? | HTMX call, own presenter chain | Nest it |

## May Call

- Usecases (via DI or direct instantiation)
- Presenters (via direct instantiation)

## DI Registration

Not registered in the DI container. Framework-owned. Instantiated by the framework per request.

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| View calling a repository | Move to use case |
| View calling a service | Move to use case |
| View choosing which component to render | Move to presenter |
| View formatting data for display | Move to presenter |
| View containing `if` branches on output state | Presenter should return pre-configured component |
| Rendering HTML after POST (root view) | Redirect 303 to GET |
