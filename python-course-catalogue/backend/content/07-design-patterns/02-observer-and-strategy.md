---
title: "Observer and Strategy Patterns"
description: "Decouple components with Observer and make algorithms interchangeable with Strategy."
duration_minutes: 25
order: 2
---

## Observer Pattern

Defines a one-to-many dependency between objects:

```python
from typing import Callable

class EventEmitter:
    def __init__(self):
        self._listeners: dict[str, list[Callable]] = {}

    def on(self, event: str, callback: Callable) -> None:
        self._listeners.setdefault(event, []).append(callback)

    def emit(self, event: str, **data) -> None:
        for cb in self._listeners.get(event, []):
            cb(**data)

emitter = EventEmitter()
emitter.on("user.created", lambda name, email: print(f"Welcome {name}!"))
emitter.on("user.created", lambda name, email: print(f"Log: {email} registered"))
emitter.emit("user.created", name="Alice", email="alice@example.com")
```

### Class-Based Observer

```python
from abc import ABC, abstractmethod

class Observer(ABC):
    @abstractmethod
    def update(self, event: str, data: dict) -> None: ...

class Subject:
    def __init__(self):
        self._observers: list[Observer] = []

    def attach(self, observer: Observer) -> None:
        self._observers.append(observer)

    def detach(self, observer: Observer) -> None:
        self._observers.remove(observer)

    def notify(self, event: str, data: dict) -> None:
        for observer in self._observers:
            observer.update(event, data)

class EmailNotifier(Observer):
    def update(self, event: str, data: dict) -> None:
        if event == "order.placed":
            print(f"Sending email for order {data['order_id']}")

class InventoryUpdater(Observer):
    def update(self, event: str, data: dict) -> None:
        if event == "order.placed":
            print(f"Updating inventory for {data['items']}")

store = Subject()
store.attach(EmailNotifier())
store.attach(InventoryUpdater())
store.notify("order.placed", {"order_id": 42, "items": ["book"]})
```

## Strategy Pattern

Define a family of algorithms and make them interchangeable:

```python
from typing import Protocol

class SortStrategy(Protocol):
    def sort(self, data: list) -> list: ...

class BubbleSort:
    def sort(self, data: list) -> list:
        arr = data.copy()
        n = len(arr)
        for i in range(n):
            for j in range(n - i - 1):
                if arr[j] > arr[j + 1]:
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
        return arr

class QuickSort:
    def sort(self, data: list) -> list:
        if len(data) <= 1:
            return data
        pivot = data[len(data) // 2]
        left = [x for x in data if x < pivot]
        mid = [x for x in data if x == pivot]
        right = [x for x in data if x > pivot]
        return self.sort(left) + mid + self.sort(right)

class Sorter:
    def __init__(self, strategy: SortStrategy):
        self.strategy = strategy

    def sort(self, data: list) -> list:
        return self.strategy.sort(data)

# Swap strategies at runtime
sorter = Sorter(QuickSort())
print(sorter.sort([3, 1, 4, 1, 5]))

sorter.strategy = BubbleSort()
print(sorter.sort([3, 1, 4, 1, 5]))
```

## Key Takeaways

1. Observer decouples event producers from consumers
2. Use `EventEmitter` pattern for loose coupling
3. Strategy makes algorithms swappable at runtime
4. Both patterns favor composition over inheritance
5. Use Protocol for duck-typed strategy interfaces
