# View Models

## Rule

The view model is the **typed contract** between the presenter and the template. It lives co-located with its component. The template reads `vm.*` only — it never computes, formats, or makes decisions.

## What a ViewModel Is

A pure dataclass containing everything the template needs to render. No logic. No imports beyond stdlib. No framework knowledge.

## What Belongs in a ViewModel

Not business logic — that stays in the domain. View logic is anything that exists purely because of how the UI works:

```python
@dataclass
class CartSummaryViewModel:
    # Formatted for display — domain has Decimal, view needs string
    subtotal: str           # "$12.50"
    tax: str                # "$1.87"
    total: str              # "$14.37"

    # Computed display values — derived from domain, meaningless outside UI
    item_count: int
    item_label: str         # "1 item" vs "3 items" — pluralisation is a view concern

    # Display flags — template conditions as named booleans
    show_checkout: bool
    show_free_shipping_nudge: bool

    # UI-specific labels — copy that depends on state
    nudge_message: str      # "Add $5 more for free shipping"
    checkout_label: str     # "Checkout" vs "Continue to Payment"

    items: list[CartItemViewModel]
```

## ViewModel Categories

| Category | Example | Domain Source |
|---|---|---|
| **Formatted values** | `"$12.50"`, `"2024-01-15"` | `Decimal`, `datetime` → formatted string |
| **Display flags** | `show_checkout`, `show_nudge` | Domain booleans (`is_locked`) → named UI flags |
| **Computed labels** | `item_label`, `nudge_message` | Domain data → human-readable strings |
| **Nested VMs** | `items: list[CartItemViewModel]` | Entity set → flat list of VMs |

## What a ViewModel Does Not Do

- Does not import or know about the domain
- Does not import or know about the framework
- Does not contain computation or logic
- Does not format itself (presenter does that)
- Does not know about HTTP, databases, or services

## Domain vs Presenter vs Template

| Layer | Concern | Example |
|---|---|---|
| **Domain** | What is true? | `is_empty: bool`, `shipping_delta: Decimal`, `is_locked: bool` |
| **Presenter** | What should appear? | `show_nudge: bool`, `nudge_message: str`, `checkout_label: str` |
| **Template** | Renders `vm.*` | `{{ vm.subtotal }}`, `{% if vm.show_nudge %}` |

The template has no questions left to answer. It just reads `vm.*`.

## Naming

Co-located with its component. Named `{ComponentName}ViewModel`:

| Component | ViewModel |
|---|---|
| `CartSummaryComponent` | `CartSummaryViewModel` |
| `CartEmptyComponent` | `CartEmptyViewModel` |
| `CartErrorComponent` | `CartErrorViewModel` |

## May Call

Nothing. Data-only dataclass.

## DI Registration

Never registered. Instantiated as `new` in the presenter.

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| ViewModel importing domain entities | ViewModel is strings and booleans — no domain types |
| ViewModel formatting itself | Presenter formats; ViewModel is the result |
| ViewModel containing domain logic | Move to domain entity |
| Template calling methods on ViewModel | ViewModel is all values — no methods to call |
| ViewModel referencing framework or HTTP | Pure dataclass, zero framework imports |
