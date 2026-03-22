---
title: "Advanced Design Patterns"
description: "Implement sophisticated design patterns for maintainable Python applications."
duration_minutes: 40
order: 4
---

## The Strategy Pattern

Encapsulate algorithms and make them interchangeable:

```python
from abc import ABC, abstractmethod
from typing import Protocol

# Using Protocol (preferred in Python)
class PaymentStrategy(Protocol):
    def pay(self, amount: float) -> bool: ...

class CreditCardPayment:
    def __init__(self, card_number: str):
        self.card_number = card_number

    def pay(self, amount: float) -> bool:
        print(f"Paying ${amount} with card {self.card_number[-4:]}")
        return True

class PayPalPayment:
    def __init__(self, email: str):
        self.email = email

    def pay(self, amount: float) -> bool:
        print(f"Paying ${amount} via PayPal ({self.email})")
        return True

class ShoppingCart:
    def __init__(self):
        self.items: list[tuple[str, float]] = []

    def add(self, name: str, price: float) -> None:
        self.items.append((name, price))

    def checkout(self, payment: PaymentStrategy) -> bool:
        total = sum(price for _, price in self.items)
        return payment.pay(total)

# Usage
cart = ShoppingCart()
cart.add("Book", 29.99)
cart.add("Pen", 4.99)
cart.checkout(CreditCardPayment("1234567890123456"))
cart.checkout(PayPalPayment("user@email.com"))
```

## The Observer Pattern

Notify multiple objects of state changes:

```python
from typing import Protocol, Callable

class Observer(Protocol):
    def update(self, event: str, data: dict) -> None: ...

class EventEmitter:
    def __init__(self):
        self._observers: dict[str, list[Callable]] = {}

    def on(self, event: str, callback: Callable) -> None:
        if event not in self._observers:
            self._observers[event] = []
        self._observers[event].append(callback)

    def off(self, event: str, callback: Callable) -> None:
        if event in self._observers:
            self._observers[event].remove(callback)

    def emit(self, event: str, data: dict = None) -> None:
        for callback in self._observers.get(event, []):
            callback(data or {})

# Usage
emitter = EventEmitter()

def on_user_created(data):
    print(f"Sending welcome email to {data['email']}")

def on_user_created_log(data):
    print(f"Logging: User {data['name']} created")

emitter.on("user_created", on_user_created)
emitter.on("user_created", on_user_created_log)

emitter.emit("user_created", {"name": "Alice", "email": "alice@example.com"})
```

## The Command Pattern

Encapsulate operations as objects:

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...

@dataclass
class AddTextCommand(Command):
    document: list
    text: str
    position: int = -1

    def execute(self) -> None:
        if self.position == -1:
            self.position = len(self.document)
        self.document.insert(self.position, self.text)

    def undo(self) -> None:
        self.document.pop(self.position)

class CommandHistory:
    def __init__(self):
        self._history: list[Command] = []
        self._position = -1

    def execute(self, command: Command) -> None:
        # Remove any "future" commands if we've undone
        self._history = self._history[:self._position + 1]
        command.execute()
        self._history.append(command)
        self._position += 1

    def undo(self) -> None:
        if self._position >= 0:
            self._history[self._position].undo()
            self._position -= 1

    def redo(self) -> None:
        if self._position < len(self._history) - 1:
            self._position += 1
            self._history[self._position].execute()

# Usage
doc = []
history = CommandHistory()

history.execute(AddTextCommand(doc, "Hello"))
history.execute(AddTextCommand(doc, " World"))
print(doc)  # ['Hello', ' World']

history.undo()
print(doc)  # ['Hello']

history.redo()
print(doc)  # ['Hello', ' World']
```

## The Chain of Responsibility

Pass requests along a chain of handlers:

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class Request:
    type: str
    content: str

class Handler(ABC):
    def __init__(self):
        self._next: Handler | None = None

    def set_next(self, handler: "Handler") -> "Handler":
        self._next = handler
        return handler

    def handle(self, request: Request) -> str | None:
        if self._next:
            return self._next.handle(request)
        return None

class SpamHandler(Handler):
    def handle(self, request: Request) -> str | None:
        if "viagra" in request.content.lower():
            return "Blocked: Spam detected"
        return super().handle(request)

class AuthHandler(Handler):
    def handle(self, request: Request) -> str | None:
        if request.type == "admin" and "password" not in request.content:
            return "Blocked: Authentication required"
        return super().handle(request)

class LogHandler(Handler):
    def handle(self, request: Request) -> str | None:
        print(f"Log: Processing {request.type} request")
        return super().handle(request)

# Build chain
spam = SpamHandler()
auth = AuthHandler()
log = LogHandler()

spam.set_next(auth).set_next(log)

# Process requests
print(spam.handle(Request("user", "Hello")))
print(spam.handle(Request("user", "Buy Viagra now!")))
```

## The State Pattern

Alter behavior based on internal state:

```python
from abc import ABC, abstractmethod

class State(ABC):
    @abstractmethod
    def insert_coin(self, machine: "VendingMachine") -> None: ...

    @abstractmethod
    def select_item(self, machine: "VendingMachine") -> None: ...

    @abstractmethod
    def dispense(self, machine: "VendingMachine") -> None: ...

class IdleState(State):
    def insert_coin(self, machine: "VendingMachine") -> None:
        print("Coin inserted")
        machine.state = HasCoinState()

    def select_item(self, machine: "VendingMachine") -> None:
        print("Please insert coin first")

    def dispense(self, machine: "VendingMachine") -> None:
        print("Please insert coin and select item")

class HasCoinState(State):
    def insert_coin(self, machine: "VendingMachine") -> None:
        print("Coin already inserted")

    def select_item(self, machine: "VendingMachine") -> None:
        print("Item selected")
        machine.state = DispensingState()

    def dispense(self, machine: "VendingMachine") -> None:
        print("Please select item first")

class DispensingState(State):
    def insert_coin(self, machine: "VendingMachine") -> None:
        print("Please wait, dispensing")

    def select_item(self, machine: "VendingMachine") -> None:
        print("Please wait, dispensing")

    def dispense(self, machine: "VendingMachine") -> None:
        print("Dispensing item...")
        machine.state = IdleState()

class VendingMachine:
    def __init__(self):
        self.state: State = IdleState()

    def insert_coin(self) -> None:
        self.state.insert_coin(self)

    def select_item(self) -> None:
        self.state.select_item(self)

    def dispense(self) -> None:
        self.state.dispense(self)

# Usage
machine = VendingMachine()
machine.select_item()   # Please insert coin first
machine.insert_coin()   # Coin inserted
machine.select_item()   # Item selected
machine.dispense()      # Dispensing item...
```

## The Builder Pattern

Construct complex objects step by step:

```python
from dataclasses import dataclass, field

@dataclass
class Query:
    table: str
    columns: list[str] = field(default_factory=list)
    conditions: list[str] = field(default_factory=list)
    order_by: str | None = None
    limit: int | None = None

class QueryBuilder:
    def __init__(self, table: str):
        self._query = Query(table=table)

    def select(self, *columns: str) -> "QueryBuilder":
        self._query.columns.extend(columns)
        return self

    def where(self, condition: str) -> "QueryBuilder":
        self._query.conditions.append(condition)
        return self

    def order(self, column: str) -> "QueryBuilder":
        self._query.order_by = column
        return self

    def limit(self, n: int) -> "QueryBuilder":
        self._query.limit = n
        return self

    def build(self) -> str:
        q = self._query
        cols = ", ".join(q.columns) if q.columns else "*"
        sql = f"SELECT {cols} FROM {q.table}"
        if q.conditions:
            sql += f" WHERE {' AND '.join(q.conditions)}"
        if q.order_by:
            sql += f" ORDER BY {q.order_by}"
        if q.limit:
            sql += f" LIMIT {q.limit}"
        return sql

# Usage
query = (
    QueryBuilder("users")
    .select("id", "name", "email")
    .where("active = true")
    .where("age > 18")
    .order("created_at DESC")
    .limit(10)
    .build()
)
# SELECT id, name, email FROM users WHERE active = true AND age > 18 ORDER BY created_at DESC LIMIT 10
```

## Key Takeaways

1. **Strategy**: Swap algorithms at runtime via composition
2. **Observer**: Decouple publishers from subscribers
3. **Command**: Encapsulate operations for undo/redo/queuing
4. **Chain of Responsibility**: Process requests through handler pipeline
5. **State**: Change behavior based on internal state
6. **Builder**: Construct complex objects fluently
