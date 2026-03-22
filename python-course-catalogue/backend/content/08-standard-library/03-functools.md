---
title: "functools — Higher-Order Functions"
description: "Leverage functools for caching, partial application, and function transformation."
duration_minutes: 25
order: 3
---

## Overview

The `functools` module is part of Python's standard library and provides tools for higher-order functions — functions that act on or return other functions. It covers caching, partial application, function composition, and dispatch. Knowing this module well is a mark of a Python developer who writes clean, performant, and maintainable code.

---

## lru_cache — Memoizing Pure Functions

`lru_cache` (Least Recently Used cache) stores the results of function calls keyed by their arguments. On repeated calls with the same arguments, the cached result is returned instead of re-executing the function.

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(50))   # instant
print(fibonacci(100))  # still instant due to cache hits
```

Without the cache, `fibonacci(50)` would make over a trillion recursive calls. With it, each unique value of `n` is computed exactly once.

### cache_info() and cache_clear()

```python
print(fibonacci.cache_info())
# CacheInfo(hits=97, misses=51, maxsize=128, currsize=51)

fibonacci.cache_clear()
print(fibonacci.cache_info())
# CacheInfo(hits=0, misses=0, maxsize=128, currsize=0)
```

- `hits`: how many times a cached result was returned
- `misses`: how many times the function was actually called
- `currsize`: current number of cached entries

### The maxsize Parameter

- `maxsize=None` disables eviction (unbounded cache, same as `cache` below)
- `maxsize=128` keeps the 128 most recently used entries
- Must be a power of two for best performance (but any positive int works)

### typed=True

When `typed=True`, arguments of different types are cached separately:

```python
@lru_cache(maxsize=128, typed=True)
def process(value):
    print(f"Computing for {value!r}")
    return value * 2

process(3)     # misses, computes
process(3.0)   # misses again — 3 (int) != 3.0 (float) when typed=True
process(3)     # hits
```

### When to Use lru_cache

- Pure functions (no side effects, same input always gives same output)
- Recursive algorithms (Fibonacci, factorial, tree traversal)
- Expensive computations called repeatedly with the same inputs
- API responses during a request lifetime (add explicit cache_clear() calls)

### Pitfall: Unhashable Arguments

`lru_cache` requires all arguments to be hashable. Passing a list or dict raises `TypeError`:

```python
@lru_cache(maxsize=128)
def bad(items):
    return sum(items)

bad([1, 2, 3])  # TypeError: unhashable type: 'list'
```

Fix: convert to a tuple before calling, or use a different caching strategy.

---

## cache — Unbounded lru_cache (Python 3.9+)

`functools.cache` is simply `lru_cache(maxsize=None)` with a cleaner name. Use it when you know your input space is small and bounded.

```python
from functools import cache

@cache
def count_ways(n: int, step_sizes: tuple[int, ...]) -> int:
    """Count ways to climb n stairs taking step_sizes steps at a time."""
    if n == 0:
        return 1
    if n < 0:
        return 0
    return sum(count_ways(n - step, step_sizes) for step in step_sizes)

print(count_ways(10, (1, 2, 3)))  # 274
```

Note: `step_sizes` must be a tuple, not a list, because lists are not hashable.

---

## cached_property — Lazy Computed Instance Attributes

`cached_property` computes a value on first access and then stores it directly on the instance. Unlike `property`, it does not re-execute the function on subsequent accesses.

```python
from functools import cached_property
import statistics

class DataSet:
    def __init__(self, data: list[float]):
        self._data = data

    @cached_property
    def mean(self) -> float:
        print("Computing mean...")
        return statistics.mean(self._data)

    @cached_property
    def stdev(self) -> float:
        print("Computing stdev...")
        return statistics.stdev(self._data)

ds = DataSet([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
print(ds.mean)   # prints "Computing mean..." then 5.5
print(ds.mean)   # prints 5.5 — no recomputation
print(ds.stdev)  # prints "Computing stdev..." then result
```

Internally, `cached_property` stores the result in `instance.__dict__` under the property name, which is why subsequent attribute lookups skip the descriptor entirely.

### Pitfall: Thread Safety

`cached_property` is not thread-safe by default. If two threads access an uncomputed `cached_property` simultaneously, the function may run twice. For thread safety, use a lock or switch to `lru_cache`.

---

## partial — Fixing Arguments of a Function

`functools.partial` creates a new callable with some arguments of an existing function pre-filled.

```python
from functools import partial

def power(base, exponent):
    return base ** exponent

square = partial(power, exponent=2)
cube   = partial(power, exponent=3)

print(square(5))   # 25
print(cube(3))     # 27
```

### Real Use: Configuring Sort Keys

```python
from functools import partial

def multi_key(item, keys):
    return tuple(item[k] for k in keys)

data = [
    {"name": "Alice", "age": 30, "dept": "Eng"},
    {"name": "Bob",   "age": 25, "dept": "Eng"},
    {"name": "Carol", "age": 30, "dept": "HR"},
]

sort_by_dept_age = partial(multi_key, keys=["dept", "age"])
sorted_data = sorted(data, key=sort_by_dept_age)
for row in sorted_data:
    print(row)
```

### Real Use: Creating Specialized Callbacks

```python
import logging
from functools import partial

logger = logging.getLogger(__name__)

# Create specialized loggers for different subsystems
log_db    = partial(logger.info, extra={"subsystem": "db"})
log_cache = partial(logger.info, extra={"subsystem": "cache"})

log_db("Query executed in %.3fs", 0.042)
log_cache("Cache hit for key %s", "user:42")
```

### partial vs lambda

Both achieve similar results, but `partial` is preferred when:
- You need a named, reusable callable
- You want introspection: `partial` exposes `.func`, `.args`, `.keywords`
- You are passing callables to other higher-order functions

```python
add5 = partial(int.__add__, 5)
print(add5.func)      # <slot wrapper '__add__' of 'int' objects>
print(add5.args)      # (5,)
print(add5.keywords)  # {}
```

---

## reduce — Folding an Iterable

`functools.reduce` applies a two-argument function cumulatively to the items of an iterable, reducing it to a single value.

```python
from functools import reduce
from operator import mul

# Factorial
def factorial(n):
    return reduce(mul, range(1, n + 1), 1)

print(factorial(5))   # 120
print(factorial(10))  # 3628800
```

### With an Initial Value

The third argument is the initial accumulator value, which also handles empty iterables:

```python
data = []
total = reduce(lambda acc, x: acc + x, data, 0)  # 0, not an error
```

### Comparison with Built-ins

For many common use cases, Python has built-in alternatives that are clearer:

```python
numbers = [1, 2, 3, 4, 5]

# Sum
total = reduce(lambda a, b: a + b, numbers)
total = sum(numbers)  # prefer this

# Max
maximum = reduce(lambda a, b: a if a > b else b, numbers)
maximum = max(numbers)  # prefer this

# Flatten one level
nested = [[1, 2], [3, 4], [5]]
flat = reduce(lambda a, b: a + b, nested, [])
# But list(itertools.chain.from_iterable(nested)) is faster
```

Use `reduce` when no built-in matches your operation — for example, composing functions:

```python
from functools import reduce

def compose(*functions):
    """Apply functions right to left: compose(f, g)(x) == f(g(x))"""
    return reduce(lambda f, g: lambda *args: f(g(*args)), functions)

double = lambda x: x * 2
add_one = lambda x: x + 1
square = lambda x: x ** 2

transform = compose(double, add_one, square)
print(transform(3))  # double(add_one(square(3))) = double(add_one(9)) = double(10) = 20
```

---

## wraps — Preserving Function Metadata in Decorators

When you write a decorator, the wrapper function replaces the original. Without `wraps`, the original's `__name__`, `__doc__`, and `__annotations__` are lost.

```python
from functools import wraps
import time

def timed(func):
    @wraps(func)          # <-- ALWAYS do this
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timed
def fetch_data(url: str) -> dict:
    """Fetch data from a URL and return parsed JSON."""
    import time
    time.sleep(0.01)
    return {}

print(fetch_data.__name__)   # fetch_data (not "wrapper")
print(fetch_data.__doc__)    # "Fetch data from a URL..."
```

Without `@wraps(func)`:

```python
print(fetch_data.__name__)   # wrapper  ← wrong
print(fetch_data.__doc__)    # None     ← wrong
```

This matters for documentation generators, debuggers, logging, and introspection tools like `help()`.

---

## total_ordering — Complete Comparison from Two Methods

If you define `__eq__` and one of `__lt__`, `__le__`, `__gt__`, or `__ge__`, `total_ordering` fills in the rest.

```python
from functools import total_ordering

@total_ordering
class Version:
    def __init__(self, major: int, minor: int, patch: int):
        self.major = major
        self.minor = minor
        self.patch = patch

    def __eq__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor, self.patch) == (other.major, other.minor, other.patch)

    def __lt__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor, self.patch) < (other.major, other.minor, other.patch)

    def __repr__(self):
        return f"Version({self.major}, {self.minor}, {self.patch})"

v1 = Version(1, 2, 3)
v2 = Version(1, 3, 0)
v3 = Version(1, 2, 3)

print(v1 < v2)   # True  (from __lt__)
print(v1 > v2)   # False (generated)
print(v1 <= v3)  # True  (generated)
print(v1 >= v3)  # True  (generated)
print(sorted([v2, v1, v3]))  # [Version(1,2,3), Version(1,2,3), Version(1,3,0)]
```

Note: `total_ordering` has a minor performance cost because generated methods use indirect calls. For performance-critical code, implement all six methods manually.

---

## singledispatch — Function Overloading by Type

`singledispatch` transforms a function into a generic function that dispatches to different implementations based on the type of the first argument.

```python
from functools import singledispatch

@singledispatch
def serialize(value) -> str:
    """Default: use repr()"""
    return repr(value)

@serialize.register(int)
def _(value: int) -> str:
    return str(value)

@serialize.register(float)
def _(value: float) -> str:
    return f"{value:.6g}"

@serialize.register(list)
def _(value: list) -> str:
    return "[" + ", ".join(serialize(item) for item in value) + "]"

@serialize.register(dict)
def _(value: dict) -> str:
    pairs = ", ".join(f"{serialize(k)}: {serialize(v)}" for k, v in value.items())
    return "{" + pairs + "}"

print(serialize(42))                        # "42"
print(serialize(3.14159))                   # "3.14159"
print(serialize([1, "hello", 3.14]))        # "[1, hello, 3.14]"
print(serialize({"a": 1, "b": [2, 3]}))    # "{a: 1, b: [2, 3]}"
print(serialize(None))                      # "None"  (default)
```

### Real Use: Type-Dispatched JSON Encoder

```python
from functools import singledispatch
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
import json

@singledispatch
def to_json_serializable(obj):
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

@to_json_serializable.register(date)
def _(obj: date):
    return obj.isoformat()

@to_json_serializable.register(datetime)
def _(obj: datetime):
    return obj.isoformat()

@to_json_serializable.register(Decimal)
def _(obj: Decimal):
    return float(obj)

@to_json_serializable.register(UUID)
def _(obj: UUID):
    return str(obj)

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        try:
            return to_json_serializable(obj)
        except TypeError:
            return super().default(obj)

from datetime import datetime
from decimal import Decimal
from uuid import uuid4

data = {
    "id": uuid4(),
    "created": datetime.now(),
    "price": Decimal("19.99"),
}
print(json.dumps(data, cls=CustomEncoder, indent=2))
```

---

## Real-World Example: Retry Decorator

Combining `wraps`, `partial`, and function metadata for a production-quality retry decorator:

```python
from functools import wraps
import time
import logging

logger = logging.getLogger(__name__)

def retry(max_attempts: int = 3, delay: float = 1.0, exceptions: tuple = (Exception,)):
    """
    Retry decorator with configurable attempts, delay, and exception types.

    Usage:
        @retry(max_attempts=3, delay=0.5, exceptions=(IOError, TimeoutError))
        def fetch(url): ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as exc:
                    last_exc = exc
                    if attempt < max_attempts:
                        logger.warning(
                            "%s failed (attempt %d/%d): %s. Retrying in %.1fs...",
                            func.__name__, attempt, max_attempts, exc, delay
                        )
                        time.sleep(delay * attempt)  # exponential-ish backoff
                    else:
                        logger.error(
                            "%s failed after %d attempts: %s",
                            func.__name__, max_attempts, exc
                        )
            raise last_exc
        return wrapper
    return decorator

# Usage
@retry(max_attempts=3, delay=0.5, exceptions=(ConnectionError, TimeoutError))
def call_external_api(endpoint: str) -> dict:
    """Call an external API and return parsed JSON."""
    # ... real implementation
    return {}

# Metadata is preserved:
print(call_external_api.__name__)   # call_external_api
print(call_external_api.__doc__)    # "Call an external API..."
```

---

## Key Takeaways

- **`lru_cache`** memoizes pure functions with a bounded LRU cache. Use `cache_info()` to tune `maxsize`. Remember all arguments must be hashable.
- **`cache`** (3.9+) is an unbounded `lru_cache` — simpler syntax, use when the input space is small.
- **`cached_property`** computes an expensive attribute once and stores it on the instance. Not thread-safe by default.
- **`partial`** creates pre-configured callables. Prefer it over lambdas for named, reusable configurations.
- **`reduce`** folds iterables when no built-in alternative exists. Prefer `sum`, `max`, `min` when they apply.
- **`wraps`** is mandatory in every decorator — it preserves `__name__`, `__doc__`, and `__annotations__` so tooling works correctly.
- **`total_ordering`** reduces boilerplate when writing comparable classes. Define `__eq__` + one comparison method and get the rest free.
- **`singledispatch`** brings type-based polymorphism to free functions. Ideal for serializers, formatters, and visitor patterns where you cannot modify the types being dispatched on.
