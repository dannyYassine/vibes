# Components

## Rule

Each component is a **self-contained UI unit** — owns its view model, its template, its CSS, and its JS. The presenter picks which component to instantiate and injects the view model. The component is the MVP View.

## What a Component Is

A framework-level UI class that:
- Receives a ViewModel via constructor (`__init__(self, vm=ViewModel)`)
- Holds its template (inline or file)
- Holds its CSS and JS
- Exposes `render_to_response()` or equivalent
- Is the **passive MVP View** — renders what it receives, makes no decisions

## The Flow

```
CartOutput → Presenter → CartSummaryComponent(vm=ViewModel) → Template reads vm.*
```

The presenter picks which component. The component renders it. No component picks itself.

## Structure

```python
@register("cart-summary")
class CartSummaryComponent(Component):

    def __init__(self, vm: CartSummaryViewModel, **kwargs):
        super().__init__(**kwargs)
        self.vm = vm

    @property
    def template(self) -> str:
        return """
        <div class="cart-summary">
          <p>{{ vm.item_label }}</p>

          {% for item in vm.items %}
            <div class="cart-item">
              <span>{{ item.name }}</span>
              <span>{{ item.quantity }} × {{ item.unit_price }}</span>
              <span>{{ item.subtotal }}</span>
            </div>
          {% endfor %}

          {% if vm.show_free_shipping_nudge %}
            <p class="nudge">{{ vm.nudge_message }}</p>
          {% endif %}

          <div class="totals">
            <p>Subtotal: {{ vm.subtotal }}</p>
            <p>Tax: {{ vm.tax }}</p>
            <p><strong>Total: {{ vm.total }}</strong></p>
          </div>

          {% if vm.show_checkout %}
            <a href="{% url 'checkout:start' %}">Checkout</a>
          {% endif %}
        </div>
        """

    css = """
        .cart-summary { padding: 1rem; }
        .cart-item { display: flex; gap: 1rem; padding: .5rem 0; }
        .totals { border-top: 1px solid #eee; margin-top: 1rem; padding-top: 1rem; }
        .nudge { color: green; font-size: 13px; }
    """

    def get_context_data(self, **kwargs):
        return {"vm": self.vm}
```

## @property Template Rule

Use `@property` for **presentation variants** (compact vs full layout) — not for state branching.

| Use `@property` for | Do NOT use `@property` for |
|---|---|
| Compact vs full layout | Empty vs error vs full state |
| Admin vs customer view variant | Checking `vm.is_empty` |
| Mobile vs desktop template | Branching on domain state |

State branching belongs in the presenter. If the property checks `vm.is_empty`, move that decision upstream.

## Inline vs File Templates

| Inline | File |
|---|---|
| Template under ~20 lines | Template over ~20 lines |
| Self-contained, focused component | Complex CSS/JS needing editor support |
| Internal/private component | Designers touching the template |
| Rapid iteration | Template shared across multiple components |

CSS and JS deduplicate automatically — even if a component renders 10 times, the styles and scripts load once.

## What a Component Does

- Receives a ViewModel via constructor
- Exposes template, CSS, and JS
- Renders to HTTP response via `render_to_response()`
- Reads `vm.*` in template — no computation, no formatting

## What a Component Does Not Do

- Does not pick itself (presenter does that)
- Does not call use cases, services, or repositories
- Does not contain business logic
- Does not format data (presenter did that)
- Does not know the Use Case output DTO — only knows its ViewModel

## May Call

- Template engine (renders `vm.*`)
- Nothing else — passive renderer

## DI Registration

Never registered. Instantiated by the presenter directly.

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Component receiving raw domain entity | Build and pass a ViewModel |
| Component picking itself based on state | Presenter picks the component class |
| Component containing business logic | Move to domain/use case |
| Template computing values | Pre-compute in presenter, put in ViewModel |
| Template branching on domain state | Presenter decides, maps to `show_*` boolean |
| `@property template` checking `vm.is_empty` | Presenter should have picked `CartEmptyComponent` instead |
