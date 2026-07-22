# Presenters

## Rule

The presenter is the **bridge** between the domain world and the UI world. Only class that speaks both languages. Owns three decisions: which component, what data shape, and returns a ready-to-render component.

## The Three Decisions

| Decision | Responsibility | Example |
|---|---|---|
| **Which component?** | Pick based on output state | Empty → `CartEmptyComponent`, Error → `CartErrorComponent`, Full → `CartSummaryComponent` |
| **What data shape?** | Build the ViewModel | Format Decimal→string (`"$12.50"`), pluralize labels (`"3 items"`), compute display flags (`show_checkout`) |
| **Returns** | A configured Component | ViewModel injected, ready to render, no further decisions |

## What a Presenter Does

- Receives a use case output DTO
- Picks the correct component class based on output state
- Builds a ViewModel with display-formatted data
- Instantiates the component with the ViewModel
- Returns the configured component

## What a Presenter Does Not Do

- Does not call services or repositories
- Does not call use cases
- Does not touch the database
- Does not know about HTTP or requests
- Does not contain business logic

## Signature

```python
class CartPresenter:
    def present(self, output: CartOutput) -> Component:
        if output.is_empty:
            return CartEmptyComponent(
                vm=CartEmptyViewModel(message="Your cart is empty")
            )

        if output.has_error:
            return CartErrorComponent(
                vm=CartErrorViewModel(message=output.error)
            )

        return CartSummaryComponent(
            vm=CartSummaryViewModel(
                items=[
                    CartItemViewModel(
                        product_id=item.product_id,
                        name=item.name,
                        unit_price=f"${item.unit_price:.2f}",
                        quantity=item.quantity,
                        subtotal=f"${item.subtotal:.2f}",
                    )   
                    for item in output.items
                ],
                subtotal=f"${output.subtotal:.2f}",
                tax=f"${output.tax:.2f}",
                total=f"${output.total:.2f}",
                item_count=sum(i.quantity for i in output.items),
                item_label=_pluralise(item_count, "item"),
                show_checkout=not output.is_locked,
                show_free_shipping_nudge=output.shipping_delta > 0,
                nudge_message=f"Add ${output.shipping_delta:.2f} for free shipping",
            )
        )
```

## Domain Asks vs Presenter Answers

| Domain asks | Presenter answers |
|---|---|
| What is true? | What should appear? |
| `is_empty` (bool) | Picks `CartEmptyComponent` |
| `shipping_delta` (Decimal) | `show_nudge` (bool) + `nudge_message` (str) |
| `is_locked` (bool) | `show_checkout` (bool) + `checkout_label` (str) |

## Adding a New State

Adding a new state (locked during checkout, fraud review, etc.) means:
1. Add one component class
2. Add one branch in the presenter

The View never changes.

## May Call

- ViewModel constructors (direct instantiation)
- Component constructors (direct instantiation)

## DI Registration

Typically not registered — stateless, instantiated inline. If registered, use transient scope.

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Presenter calling a use case | Presenter only receives output, never triggers business logic |
| Presenter calling a repository | Move to use case |
| Presenter passing raw domain entities to template | Build a ViewModel |
| Presenter holding state between calls | Stateless — one `present()` call per request |
| Component picking itself (template decides) | Presenter picks which component |
| `@property` template checking `vm.is_empty` | Branch already happened in presenter |
