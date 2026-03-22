---
title: "Error Handling"
description: "Handle exceptions gracefully and create custom error types."
duration_minutes: 25
order: 6
---

## Why Handle Errors?

Errors happen. Network requests fail. Files don't exist. Users enter invalid data. Good error handling makes programs robust and user-friendly.

## try/except Blocks

Catch and handle exceptions:

```python
try:
    result = 10 / 0
except ZeroDivisionError:
    print("Cannot divide by zero!")
    result = 0
```

### Catching Multiple Exceptions

```python
try:
    value = int(input("Enter a number: "))
    result = 10 / value
except ValueError:
    print("That's not a valid number")
except ZeroDivisionError:
    print("Cannot divide by zero")

# Or handle multiple in one clause
try:
    # risky operation
    pass
except (ValueError, TypeError) as e:
    print(f"Error: {e}")
```

### The Exception Hierarchy

```python
# Catch all exceptions (use sparingly)
try:
    risky_operation()
except Exception as e:
    print(f"Something went wrong: {e}")

# BaseException catches everything including KeyboardInterrupt
# Generally avoid catching BaseException
```

## else and finally

```python
try:
    file = open("data.txt")
    content = file.read()
except FileNotFoundError:
    print("File not found")
else:
    # Runs only if no exception occurred
    print(f"Read {len(content)} characters")
finally:
    # Always runs, even if exception occurred
    if 'file' in locals():
        file.close()
```

## Raising Exceptions

```python
def validate_age(age):
    if not isinstance(age, int):
        raise TypeError("Age must be an integer")
    if age < 0:
        raise ValueError("Age cannot be negative")
    if age > 150:
        raise ValueError("Age seems unrealistic")
    return age

# Re-raising exceptions
try:
    validate_age(-5)
except ValueError as e:
    print(f"Validation failed: {e}")
    raise  # Re-raise the same exception
```

## Custom Exceptions

Create domain-specific errors:

```python
class ValidationError(Exception):
    """Raised when input validation fails."""
    pass

class InsufficientFundsError(Exception):
    """Raised when account balance is too low."""
    def __init__(self, balance, amount):
        self.balance = balance
        self.amount = amount
        super().__init__(
            f"Cannot withdraw ${amount}. Balance: ${balance}"
        )

class BankAccount:
    def __init__(self, balance):
        self.balance = balance

    def withdraw(self, amount):
        if amount > self.balance:
            raise InsufficientFundsError(self.balance, amount)
        self.balance -= amount

# Using custom exception
account = BankAccount(100)
try:
    account.withdraw(150)
except InsufficientFundsError as e:
    print(f"Error: {e}")
    print(f"You tried to withdraw ${e.amount}")
```

## Exception Chaining

Show the cause of an exception:

```python
def load_config(filename):
    try:
        with open(filename) as f:
            return json.load(f)
    except FileNotFoundError as e:
        raise ConfigError(f"Config file missing: {filename}") from e
    except json.JSONDecodeError as e:
        raise ConfigError(f"Invalid JSON in {filename}") from e
```

## Context Managers and Exceptions

The `with` statement ensures cleanup:

```python
# File automatically closed even if exception occurs
with open("data.txt") as f:
    content = f.read()

# Multiple context managers
with open("input.txt") as infile, open("output.txt", "w") as outfile:
    outfile.write(infile.read().upper())
```

## Common Exception Types

```python
# ValueError - wrong value for correct type
int("not a number")

# TypeError - wrong type
len(42)

# KeyError - missing dictionary key
d = {"a": 1}
d["b"]

# IndexError - index out of range
lst = [1, 2, 3]
lst[10]

# AttributeError - missing attribute
"hello".nonexistent_method()

# FileNotFoundError - file doesn't exist
open("nonexistent.txt")

# ImportError - module import fails
import nonexistent_module
```

## Best Practices

```python
# 1. Be specific - catch only expected exceptions
try:
    user = users[user_id]
except KeyError:
    user = create_default_user()

# 2. Don't silence exceptions without reason
try:
    risky_operation()
except SomeError:
    pass  # Bad - silently ignoring errors

# 3. Use logging for unexpected errors
import logging

try:
    process_data()
except Exception as e:
    logging.exception("Unexpected error processing data")
    raise

# 4. Clean up resources with finally or context managers
```

## Key Takeaways

1. Use `try`/`except` to handle expected errors gracefully
2. Be specific about which exceptions to catch
3. `finally` always runs; use for cleanup
4. Create custom exceptions for domain-specific errors
5. Use `raise` to throw exceptions, `raise from` for chaining
6. Context managers (`with`) ensure proper resource cleanup
