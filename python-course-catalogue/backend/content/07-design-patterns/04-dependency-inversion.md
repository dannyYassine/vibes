---
title: "Dependency Inversion Principle"
description: "Design flexible systems by depending on abstractions, not concrete implementations."
duration_minutes: 25
order: 4
---

## The Dependency Inversion Principle

> "High-level modules should not depend on low-level modules. Both should depend on abstractions."

## The Problem

Tight coupling to concrete implementations:

```python
# Bad: EmailService depends on SMTPClient directly
class EmailService:
    def __init__(self):
        self.smtp = SMTPClient("smtp.gmail.com", 587)  # Tightly coupled

    def send(self, to: str, subject: str, body: str):
        self.smtp.connect()
        self.smtp.send(to, subject, body)
        self.smtp.disconnect()
```

Problems:
- Can't test without a real SMTP server
- Can't switch to SendGrid without changing EmailService
- Can't use multiple providers

## The Solution: Depend on Abstractions

```python
from typing import Protocol

class MessageSender(Protocol):
    def send(self, to: str, subject: str, body: str) -> bool: ...

class SMTPSender:
    def send(self, to: str, subject: str, body: str) -> bool:
        print(f"Sending via SMTP to {to}")
        return True

class SendGridSender:
    def send(self, to: str, subject: str, body: str) -> bool:
        print(f"Sending via SendGrid to {to}")
        return True

class MockSender:
    def __init__(self):
        self.sent: list[dict] = []

    def send(self, to: str, subject: str, body: str) -> bool:
        self.sent.append({"to": to, "subject": subject})
        return True

class EmailService:
    def __init__(self, sender: MessageSender):
        self.sender = sender  # Depends on abstraction

    def send_welcome(self, email: str) -> bool:
        return self.sender.send(email, "Welcome!", "Thanks for signing up.")

# Inject concrete implementation
service = EmailService(SMTPSender())
service = EmailService(SendGridSender())

# Testing
mock = MockSender()
service = EmailService(mock)
service.send_welcome("alice@example.com")
assert len(mock.sent) == 1
```

## SOLID Principles in Python

### Single Responsibility

```python
# Bad: does too many things
class User:
    def save(self): ...
    def send_email(self): ...
    def generate_report(self): ...

# Good: each class has one job
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email

class UserRepository:
    def save(self, user: User): ...

class UserEmailer:
    def send_welcome(self, user: User): ...
```

### Open/Closed Principle

```python
# Open for extension, closed for modification
class Discount(Protocol):
    def apply(self, price: float) -> float: ...

class NoDiscount:
    def apply(self, price: float) -> float:
        return price

class PercentageDiscount:
    def __init__(self, percent: float):
        self.percent = percent

    def apply(self, price: float) -> float:
        return price * (1 - self.percent / 100)

class Order:
    def __init__(self, price: float, discount: Discount = NoDiscount()):
        self.price = price
        self.discount = discount

    def total(self) -> float:
        return self.discount.apply(self.price)
# Add new discount types without modifying Order
```

## Composition over Inheritance

```python
# Inheritance can create rigid hierarchies
class Animal:
    def breathe(self): ...

class WalkingAnimal(Animal):
    def walk(self): ...

class SwimmingAnimal(Animal):
    def swim(self): ...

# Composition is more flexible
class Breathable(Protocol):
    def breathe(self) -> None: ...

class Walkable(Protocol):
    def walk(self) -> None: ...

class Swimmable(Protocol):
    def swim(self) -> None: ...

class Duck:
    def breathe(self): print("breathing")
    def walk(self): print("walking")
    def swim(self): print("swimming")
    def quack(self): print("quack!")
```

## Key Takeaways

1. Depend on abstractions (Protocols/ABCs), not concrete classes
2. Inject dependencies — don't instantiate them inside classes
3. Single Responsibility: each class has one reason to change
4. Open/Closed: extend by adding, not modifying
5. Composition over inheritance for flexible designs
6. These principles make code testable and maintainable
