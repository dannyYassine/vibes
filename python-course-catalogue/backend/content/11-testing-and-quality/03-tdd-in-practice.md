---
title: "Test-Driven Development in Practice"
description: "Apply the red-green-refactor cycle to build reliable software with TDD."
duration_minutes: 25
order: 3
---

## The TDD Cycle

Test-Driven Development inverts the usual workflow: you write a test **before** you write the code it tests. The cycle has three phases:

```
RED   → Write a test that fails (because the code doesn't exist yet)
GREEN → Write the minimum code to make the test pass
REFACTOR → Clean up the code without breaking the tests
```

This is not just a testing technique — it is a design technique. Writing the test first forces you to think about the API from the caller's perspective before implementing it.

```
Write failing test
        ↓
Run test → RED
        ↓
Write minimal implementation
        ↓
Run test → GREEN
        ↓
Refactor (simplify, remove duplication)
        ↓
Run test → GREEN (still)
        ↓
(repeat)
```

## Why TDD?

- **Forces good design**: if your code is hard to test, it's a signal the design is wrong (too many dependencies, too tightly coupled)
- **Provides regression safety**: every new feature comes with a test that prevents it from breaking later
- **Tests as documentation**: tests show exactly how the code is intended to be used — better than any comment
- **Reduces debugging time**: small incremental steps mean you know exactly which change broke something
- **Confidence to refactor**: you can restructure code fearlessly because the tests will catch regressions

## Walking Through a Complete TDD Example: BankAccount

We will build a `BankAccount` class step by step, writing each test before its implementation.

### Step 1: Red — Create an account with a balance

```python
# test_bank_account.py
import pytest

def test_create_account_with_initial_balance():
    account = BankAccount(initial_balance=100.0)
    assert account.balance == 100.0
```

Run: `pytest test_bank_account.py` → **RED** (NameError: BankAccount not defined)

### Step 1: Green — Minimal implementation

```python
# bank_account.py
class BankAccount:
    def __init__(self, initial_balance: float = 0.0):
        self.balance = initial_balance
```

Run: `pytest test_bank_account.py` → **GREEN**

### Step 2: Red — Deposit increases balance

```python
def test_deposit_increases_balance():
    account = BankAccount(initial_balance=100.0)
    account.deposit(50.0)
    assert account.balance == 150.0

def test_deposit_zero_raises():
    account = BankAccount(initial_balance=100.0)
    with pytest.raises(ValueError, match="Deposit amount must be positive"):
        account.deposit(0)

def test_deposit_negative_raises():
    account = BankAccount(initial_balance=100.0)
    with pytest.raises(ValueError, match="Deposit amount must be positive"):
        account.deposit(-10.0)
```

Run → **RED** (AttributeError: 'BankAccount' object has no attribute 'deposit')

### Step 2: Green

```python
class BankAccount:
    def __init__(self, initial_balance: float = 0.0):
        self.balance = initial_balance

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")
        self.balance += amount
```

Run → **GREEN**

### Step 3: Red — Withdraw decreases balance

```python
def test_withdraw_decreases_balance():
    account = BankAccount(initial_balance=100.0)
    account.withdraw(30.0)
    assert account.balance == 70.0

def test_withdraw_zero_raises():
    account = BankAccount(initial_balance=100.0)
    with pytest.raises(ValueError, match="Withdrawal amount must be positive"):
        account.withdraw(0)
```

Run → **RED**

### Step 3: Green

```python
def withdraw(self, amount: float) -> None:
    if amount <= 0:
        raise ValueError("Withdrawal amount must be positive")
    self.balance -= amount
```

Run → **GREEN**

### Step 4: Red — Overdraft raises InsufficientFunds

```python
class InsufficientFunds(Exception):
    pass

def test_overdraft_raises_insufficient_funds():
    account = BankAccount(initial_balance=50.0)
    with pytest.raises(InsufficientFunds):
        account.withdraw(100.0)

def test_exact_balance_withdrawal_succeeds():
    account = BankAccount(initial_balance=50.0)
    account.withdraw(50.0)  # Should NOT raise
    assert account.balance == 0.0
```

Run → **RED** (InsufficientFunds is not raised; balance goes negative)

### Step 4: Green

```python
class InsufficientFunds(Exception):
    pass

class BankAccount:
    def __init__(self, initial_balance: float = 0.0):
        self.balance = initial_balance

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")
        self.balance += amount

    def withdraw(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("Withdrawal amount must be positive")
        if amount > self.balance:
            raise InsufficientFunds(
                f"Cannot withdraw {amount:.2f}: balance is {self.balance:.2f}"
            )
        self.balance -= amount
```

Run → **GREEN**

### Step 5: Red — Transaction history

```python
def test_transaction_history_initially_empty():
    account = BankAccount(initial_balance=100.0)
    assert account.transactions == []

def test_deposit_recorded_in_history():
    account = BankAccount(initial_balance=100.0)
    account.deposit(50.0)
    assert len(account.transactions) == 1
    assert account.transactions[0] == {"type": "deposit", "amount": 50.0, "balance": 150.0}

def test_withdrawal_recorded_in_history():
    account = BankAccount(initial_balance=100.0)
    account.withdraw(30.0)
    assert len(account.transactions) == 1
    assert account.transactions[0] == {"type": "withdrawal", "amount": 30.0, "balance": 70.0}

def test_multiple_transactions_in_order():
    account = BankAccount(initial_balance=0.0)
    account.deposit(200.0)
    account.deposit(50.0)
    account.withdraw(80.0)
    assert len(account.transactions) == 3
    assert account.transactions[-1]["balance"] == 170.0  # 200 + 50 - 80
```

Run → **RED** (AttributeError: no 'transactions')

### Step 5: Green — and Refactor

```python
from dataclasses import dataclass, field
from typing import Literal

@dataclass
class Transaction:
    type: Literal["deposit", "withdrawal"]
    amount: float
    balance: float

class InsufficientFunds(Exception):
    pass

class BankAccount:
    def __init__(self, initial_balance: float = 0.0):
        if initial_balance < 0:
            raise ValueError("Initial balance cannot be negative")
        self._balance = initial_balance
        self._transactions: list[Transaction] = []

    @property
    def balance(self) -> float:
        return self._balance

    @property
    def transactions(self) -> list[dict]:
        return [
            {"type": t.type, "amount": t.amount, "balance": t.balance}
            for t in self._transactions
        ]

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")
        self._balance += amount
        self._transactions.append(
            Transaction(type="deposit", amount=amount, balance=self._balance)
        )

    def withdraw(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("Withdrawal amount must be positive")
        if amount > self._balance:
            raise InsufficientFunds(
                f"Cannot withdraw {amount:.2f}: balance is {self._balance:.2f}"
            )
        self._balance -= amount
        self._transactions.append(
            Transaction(type="withdrawal", amount=amount, balance=self._balance)
        )
```

Run → **GREEN** — and the refactored code is cleaner, with `_balance` as a private attribute with a property getter, and a proper `Transaction` dataclass.

## Test Doubles

TDD practitioners use specific terminology for fakes:

| Double | Purpose | Example |
|---|---|---|
| **Stub** | Returns canned responses, no verification | A stub HTTP client that always returns 200 |
| **Mock** | Verifies how it was called | Asserts `send_email` was called once with correct args |
| **Fake** | Working but simplified implementation | An in-memory database instead of SQLite |
| **Spy** | Real object that records calls | A real service wrapped to track which methods were called |
| **Dummy** | Placeholder, never used | Required parameter, irrelevant to the test |

```python
# Stub: returns canned data, no verification
class StubUserRepository:
    def find_by_email(self, email: str) -> dict | None:
        return {"id": 1, "email": "test@example.com", "name": "Test User"}

# Fake: working in-memory implementation
class InMemoryUserRepository:
    def __init__(self):
        self._store: dict[int, dict] = {}
        self._next_id = 1

    def save(self, user: dict) -> dict:
        user = {**user, "id": self._next_id}
        self._store[self._next_id] = user
        self._next_id += 1
        return user

    def find_by_email(self, email: str) -> dict | None:
        return next(
            (u for u in self._store.values() if u["email"] == email),
            None
        )

# In tests, use the fake instead of a real database
def test_user_registration_with_fake_repo():
    repo = InMemoryUserRepository()
    service = UserRegistrationService(repo)

    user = service.register("Alice", "alice@example.com", "password123")
    assert user["id"] == 1
    assert repo.find_by_email("alice@example.com") is not None
```

## TDD for REST Endpoints (Outside-In)

```python
# Write the test first — describes the desired HTTP behavior
import pytest
from fastapi.testclient import TestClient

def test_create_product_returns_201(client):
    response = client.post("/api/products", json={
        "name": "Widget",
        "price": 9.99,
        "inventory": 100,
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Widget"
    assert data["price"] == 9.99
    assert "id" in data

def test_create_product_missing_name_returns_422(client):
    response = client.post("/api/products", json={"price": 9.99})
    assert response.status_code == 422

def test_get_product_not_found_returns_404(client):
    response = client.get("/api/products/99999")
    assert response.status_code == 404

def test_get_product_returns_200(client, created_product):
    product_id = created_product["id"]
    response = client.get(f"/api/products/{product_id}")
    assert response.status_code == 200
    assert response.json()["name"] == created_product["name"]
```

## Outside-In vs Inside-Out TDD

**Outside-in (London/Mockist)**:
- Start with a failing acceptance test (e.g., HTTP endpoint test)
- Mock all dependencies; test only the behavior of the current layer
- Work inward: controller → service → repository
- Advantage: drives design from user perspective
- Risk: heavy mocking can lose integration confidence

**Inside-out (Detroit/Classicist)**:
- Start with the core domain model (BankAccount example above)
- Minimal mocking; use real collaborators or fakes
- Work outward: domain → service → controller
- Advantage: builds confidence in real behavior
- Risk: may build the wrong thing (wrong API) if design isn't clear upfront

In practice, most teams use a blend: inside-out for domain logic, outside-in for integration/API layers.

## Common Objections to TDD

**"TDD takes too long."**
Tests take time to write upfront, but you save debugging time. Studies show TDD typically reduces bug density by 40-80%. Bugs found in production are 10-100x more expensive to fix than bugs caught by tests.

**"It's hard with legacy code."**
Write **characterization tests** first: tests that capture what the code currently does (even if it's wrong), then refactor safely. Michael Feathers' *Working Effectively with Legacy Code* covers this in detail.

**"TDD doesn't work for my code."**
If code is hard to test, that is valuable design feedback. Hard-to-test code is usually code with too many responsibilities, too many dependencies, or global state. TDD exposes this early.

## When TDD Is Less Applicable

- **Exploratory/prototype code**: when you don't know what you're building yet. Write the code first to discover the design, then add tests before checking in.
- **UI layout and styling**: visual output is hard to assert. Use visual regression tools instead.
- **Simple glue code**: a 3-line script that calls two functions isn't worth TDD overhead.
- **Data migrations**: often easier to write a migration, verify it manually, then add a regression test.

For production application code — especially business logic, data processing, and APIs — TDD is almost always worth the investment.

## Key Takeaways

- The TDD cycle is **Red → Green → Refactor**: write a failing test, write the minimum code to pass it, then clean up.
- TDD forces good design — if your code is hard to test, it is a signal the design needs improvement.
- Tests written first serve as living documentation: they show exactly how code is intended to be called.
- Walk through the full cycle incrementally — each test drives one small piece of behavior. Avoid writing large chunks of code between test runs.
- Use the right test double: **stub** for canned responses, **mock** for verifying calls, **fake** for working simplified implementations.
- **Outside-in TDD** starts from HTTP/API behavior and mocks dependencies; **inside-out TDD** starts from the domain and works outward. Both are valid; the choice depends on how clear the design is upfront.
- The "TDD takes too long" objection ignores debugging and maintenance time saved — TDD typically pays off within a sprint.
- For legacy code, write characterization tests first to capture existing behavior before refactoring.
