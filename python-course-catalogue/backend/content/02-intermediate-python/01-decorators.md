---
title: "Decorators"
description: "Understand how decorators work and common use cases."
duration_minutes: 30
order: 1
---

## What are Decorators?

Decorators are functions that modify the behavior of other functions. They're Python's implementation of the decorator pattern.

```python
@my_decorator
def my_function():
    pass

# Is equivalent to:
def my_function():
    pass
my_function = my_decorator(my_function)
```

## Building a Decorator Step by Step

### Functions are Objects

```python
def greet(name):
    return f"Hello, {name}!"

# Functions can be assigned to variables
say_hello = greet
print(say_hello("Alice"))  # Hello, Alice!

# Functions can be passed as arguments
def call_twice(func, arg):
    return func(arg) + " " + func(arg)

print(call_twice(greet, "Bob"))
```

### A Simple Decorator

```python
def log_calls(func):
    def wrapper(*args, **kwargs):
        print(f"Calling {func.__name__}")
        result = func(*args, **kwargs)
        print(f"Finished {func.__name__}")
        return result
    return wrapper

@log_calls
def add(a, b):
    return a + b

result = add(2, 3)
# Output:
# Calling add
# Finished add
```

## Preserving Function Metadata

Use `functools.wraps` to preserve the original function's metadata:

```python
from functools import wraps

def log_calls(func):
    @wraps(func)  # Preserves __name__, __doc__, etc.
    def wrapper(*args, **kwargs):
        print(f"Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@log_calls
def add(a, b):
    """Add two numbers."""
    return a + b

print(add.__name__)  # add (not wrapper)
print(add.__doc__)   # Add two numbers.
```

## Decorators with Arguments

```python
from functools import wraps

def repeat(times):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            results = []
            for _ in range(times):
                results.append(func(*args, **kwargs))
            return results
        return wrapper
    return decorator

@repeat(3)
def greet(name):
    return f"Hello, {name}!"

print(greet("Alice"))
# ['Hello, Alice!', 'Hello, Alice!', 'Hello, Alice!']
```

## Common Decorator Patterns

### Timing Decorator

```python
import time
from functools import wraps

def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)
    return "done"
```

### Caching/Memoization

```python
from functools import wraps

def memoize(func):
    cache = {}
    @wraps(func)
    def wrapper(*args):
        if args not in cache:
            cache[args] = func(*args)
        return cache[args]
    return wrapper

@memoize
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Or use the built-in
from functools import lru_cache

@lru_cache(maxsize=128)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```

### Retry Decorator

```python
import time
from functools import wraps

def retry(max_attempts=3, delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempts = 0
            while attempts < max_attempts:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    attempts += 1
                    if attempts == max_attempts:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator

@retry(max_attempts=3, delay=0.5)
def fetch_data():
    # May fail temporarily
    pass
```

### Authentication Decorator

```python
from functools import wraps

def require_auth(func):
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionError("Authentication required")
        return func(request, *args, **kwargs)
    return wrapper

@require_auth
def get_profile(request):
    return request.user.profile
```

## Class Decorators

Decorators can also modify classes:

```python
def singleton(cls):
    instances = {}
    @wraps(cls)
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return get_instance

@singleton
class Database:
    def __init__(self):
        print("Connecting to database...")

db1 = Database()  # Prints "Connecting..."
db2 = Database()  # No print - returns same instance
print(db1 is db2)  # True
```

## Stacking Decorators

Multiple decorators are applied bottom-up:

```python
@decorator_a
@decorator_b
@decorator_c
def my_function():
    pass

# Equivalent to:
my_function = decorator_a(decorator_b(decorator_c(my_function)))
```

## Key Takeaways

1. Decorators wrap functions to modify their behavior
2. Always use `@functools.wraps` to preserve metadata
3. Decorators with arguments need an extra wrapper layer
4. Common uses: logging, timing, caching, authentication
5. Decorators can also be applied to classes
6. Stacked decorators apply from bottom to top
