---
title: "Functions"
description: "Define reusable code blocks with parameters, return values, and scope."
duration_minutes: 30
order: 3
---

## Defining Functions

Functions are defined using the `def` keyword:

```python
def greet(name):
    """Return a greeting message."""
    return f"Hello, {name}!"

# Calling the function
message = greet("Alice")
print(message)  # Hello, Alice!
```

## Parameters and Arguments

### Positional and Keyword Arguments

```python
def create_user(name, age, city):
    return {"name": name, "age": age, "city": city}

# Positional arguments
user = create_user("Alice", 30, "NYC")

# Keyword arguments
user = create_user(name="Alice", age=30, city="NYC")

# Mixed (positional must come first)
user = create_user("Alice", age=30, city="NYC")
```

### Default Values

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

greet("Alice")           # Hello, Alice!
greet("Alice", "Hi")     # Hi, Alice!
```

### *args and **kwargs

```python
# *args - variable positional arguments
def sum_all(*numbers):
    return sum(numbers)

sum_all(1, 2, 3, 4)  # 10

# **kwargs - variable keyword arguments
def build_profile(**kwargs):
    return kwargs

profile = build_profile(name="Alice", age=30, role="Developer")
# {'name': 'Alice', 'age': 30, 'role': 'Developer'}

# Combined
def func(a, b, *args, **kwargs):
    print(f"a={a}, b={b}")
    print(f"args={args}")
    print(f"kwargs={kwargs}")

func(1, 2, 3, 4, x=5, y=6)
```

### Keyword-only Arguments

```python
# Arguments after * must be passed by keyword
def configure(host, port, *, timeout=30, retries=3):
    print(f"Connecting to {host}:{port}")
    print(f"timeout={timeout}, retries={retries}")

configure("localhost", 8080, timeout=60)
# configure("localhost", 8080, 60)  # Error!
```

## Return Values

```python
# Single return
def square(x):
    return x ** 2

# Multiple returns (tuple unpacking)
def divmod_custom(a, b):
    return a // b, a % b

quotient, remainder = divmod_custom(17, 5)

# Early return
def find_first_even(numbers):
    for n in numbers:
        if n % 2 == 0:
            return n
    return None
```

## Scope and Closures

### Local vs Global Scope

```python
global_var = "I'm global"

def my_function():
    local_var = "I'm local"
    print(global_var)   # Can read global
    print(local_var)    # Can read local

# Modifying globals (use sparingly)
counter = 0

def increment():
    global counter
    counter += 1
```

### Closures

Inner functions that remember their enclosing scope:

```python
def make_multiplier(factor):
    def multiply(x):
        return x * factor
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)

print(double(5))  # 10
print(triple(5))  # 15
```

## Lambda Functions

Anonymous functions for simple operations:

```python
# Lambda syntax
square = lambda x: x ** 2
add = lambda a, b: a + b

# Common with higher-order functions
numbers = [3, 1, 4, 1, 5, 9]
sorted_numbers = sorted(numbers, key=lambda x: -x)  # descending

# Filter and map
evens = list(filter(lambda x: x % 2 == 0, numbers))
squares = list(map(lambda x: x ** 2, numbers))
```

## Type Hints

Optional but recommended for clarity:

```python
def greet(name: str, times: int = 1) -> str:
    return (f"Hello, {name}! " * times).strip()

def process_items(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

from typing import Optional

def find_user(user_id: int) -> Optional[dict]:
    # Returns dict or None
    pass
```

## Docstrings

Document your functions:

```python
def calculate_area(length: float, width: float) -> float:
    """
    Calculate the area of a rectangle.

    Args:
        length: The length of the rectangle.
        width: The width of the rectangle.

    Returns:
        The area of the rectangle.

    Raises:
        ValueError: If length or width is negative.
    """
    if length < 0 or width < 0:
        raise ValueError("Dimensions must be non-negative")
    return length * width
```

## Key Takeaways

1. Functions are defined with `def` and can return values
2. Use `*args` for variable positional args, `**kwargs` for keyword args
3. Default parameters make arguments optional
4. Closures capture variables from enclosing scope
5. Lambda functions are useful for short, one-line operations
6. Type hints improve code clarity and IDE support
