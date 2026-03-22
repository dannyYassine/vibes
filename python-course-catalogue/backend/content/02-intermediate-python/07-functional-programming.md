---
title: "Functional Programming Patterns"
description: "Apply functional programming concepts in Python: map, filter, reduce, and more."
duration_minutes: 30
order: 7
---

## Functional Programming Patterns

Python is a multi-paradigm language. Its functional features let you write concise, composable, and testable code. This lesson covers the key concepts: first-class functions, higher-order functions, the standard functional tools, and when to use — and avoid — each one.

---

## First-Class Functions

In Python, functions are **first-class objects**. They can be assigned to variables, stored in data structures, and passed as arguments — just like integers or strings.

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"

# Assign to a variable
say_hello = greet
print(say_hello("Alice"))   # Hello, Alice!
print(say_hello is greet)   # True — same object

# Store in a data structure
operations = {
    "add": lambda a, b: a + b,
    "sub": lambda a, b: a - b,
    "mul": lambda a, b: a * b,
}
print(operations["add"](10, 5))   # 15

# Pass as an argument
def apply(func, value):
    return func(value)

print(apply(str.upper, "hello"))    # HELLO
print(apply(abs, -42))              # 42

# Return from a function
def make_multiplier(n: int):
    def multiplier(x):
        return x * n
    return multiplier   # returns a function!

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(7))   # 14
print(triple(7))   # 21
```

---

## Higher-Order Functions

A **higher-order function** is one that takes a function as an argument, returns a function, or both. `map`, `filter`, `sorted`, and decorators are all higher-order functions.

```python
def apply_twice(func, value):
    """Apply func to value, then apply func to the result."""
    return func(func(value))

print(apply_twice(lambda x: x * 2, 3))   # 12   (3*2=6, 6*2=12)
print(apply_twice(str.strip, "  hi  "))   # "hi"

# Generic retry decorator — a higher-order function returning a function
import time
from functools import wraps

def retry(times: int = 3, delay: float = 1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exc = e
                    if attempt < times:
                        time.sleep(delay)
            raise last_exc
        return wrapper
    return decorator

@retry(times=3, delay=0.1)
def fetch_data(url: str) -> dict:
    # Simulated flaky network call
    import random
    if random.random() < 0.5:
        raise ConnectionError("Network timeout")
    return {"data": "ok"}
```

---

## map(): Transform Every Element

`map(func, iterable)` applies `func` to each element and returns a **lazy iterator**.

```python
numbers = [1, 2, 3, 4, 5]

# map returns an iterator, not a list
doubled = map(lambda x: x * 2, numbers)
print(doubled)         # <map object at 0x...>
print(list(doubled))   # [2, 4, 6, 8, 10]

# Multiple iterables — stops at the shortest
sums = list(map(lambda a, b: a + b, [1, 2, 3], [10, 20, 30]))
print(sums)   # [11, 22, 33]

# Practical: convert types
raw = ["1", "2", "3", "4", "5"]
ints = list(map(int, raw))      # [1, 2, 3, 4, 5]
floats = list(map(float, raw))  # [1.0, 2.0, 3.0, 4.0, 5.0]

# map vs list comprehension
# Prefer list comprehension for readability:
doubled_lc = [x * 2 for x in numbers]            # Pythonic
doubled_map = list(map(lambda x: x * 2, numbers)) # more verbose

# map shines when you already have a named function to apply:
names = ["  alice ", "BOB", "  Charlie  "]
clean = list(map(str.strip, names))   # ['alice', 'BOB', 'Charlie']
# vs [n.strip() for n in names] — both fine, map is slightly cleaner here
```

---

## filter(): Select Elements

`filter(predicate, iterable)` returns a lazy iterator of elements where the predicate returns `True`.

```python
numbers = range(-5, 6)   # -5 to 5

positives = list(filter(lambda x: x > 0, numbers))
print(positives)   # [1, 2, 3, 4, 5]

# filter(None, iterable) removes falsy values
mixed = [0, 1, "", "hello", None, False, True, [], [1, 2]]
truthy = list(filter(None, mixed))
print(truthy)   # [1, 'hello', True, [1, 2]]

# filter vs list comprehension
# Prefer list comprehension:
positives_lc = [x for x in numbers if x > 0]     # Pythonic
positives_f  = list(filter(lambda x: x > 0, numbers))

# filter shines with named predicates:
def is_valid_email(email: str) -> bool:
    return "@" in email and "." in email.split("@")[-1]

emails = ["alice@example.com", "bad-email", "bob@test.org", "notanemail"]
valid = list(filter(is_valid_email, emails))
print(valid)   # ['alice@example.com', 'bob@test.org']
```

---

## zip() and enumerate() — Pythonic Looping

These two built-ins replace index-based loops in nearly every situation.

```python
# zip — iterate multiple iterables in lockstep
names  = ["Alice", "Bob", "Charlie"]
scores = [92, 85, 78]
grades = ["A", "B", "C"]

for name, score, grade in zip(names, scores, grades):
    print(f"{name}: {score} ({grade})")
# Alice: 92 (A)
# Bob: 85 (B)
# Charlie: 78 (C)

# zip stops at the SHORTEST iterable
a = [1, 2, 3]
b = [10, 20]
print(list(zip(a, b)))   # [(1, 10), (2, 20)]

# Build a dict from two lists
keys   = ["host", "port", "db"]
values = ["localhost", 5432, "mydb"]
config = dict(zip(keys, values))
print(config)   # {'host': 'localhost', 'port': 5432, 'db': 'mydb'}

# Unzip — transpose a list of pairs
pairs = [(1, "a"), (2, "b"), (3, "c")]
nums, chars = zip(*pairs)    # * unpacks the list
print(nums)    # (1, 2, 3)
print(chars)   # ('a', 'b', 'c')

# enumerate — index + value without range(len(...))
fruits = ["apple", "banana", "cherry"]

# BAD — clunky and error-prone
for i in range(len(fruits)):
    print(f"{i}: {fruits[i]}")

# GOOD — clear intent
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")

# Start from a different index
for i, fruit in enumerate(fruits, start=1):
    print(f"{i}. {fruit}")
# 1. apple
# 2. banana
# 3. cherry
```

---

## reduce(): Fold Operations

`functools.reduce(func, iterable, initial)` accumulates a result by applying a two-argument function cumulatively.

```python
from functools import reduce

# Sum — just to illustrate; use sum() in practice
nums = [1, 2, 3, 4, 5]
total = reduce(lambda acc, x: acc + x, nums, 0)
print(total)   # 15

# Product — no built-in, reduce makes sense here
product = reduce(lambda acc, x: acc * x, nums, 1)
print(product)   # 120

# Flatten a list of lists
nested = [[1, 2], [3, 4], [5, 6]]
flat = reduce(lambda acc, lst: acc + lst, nested, [])
print(flat)   # [1, 2, 3, 4, 5, 6]
# NOTE: itertools.chain(*nested) is faster for this

# Build a nested dict from a path
def set_nested(d: dict, keys: list, value) -> dict:
    return reduce(lambda acc, k: acc.setdefault(k, {}), keys[:-1], d) \
           or d.__setitem__(keys[-1], value) or d   # side-effect based

# Use reduce sparingly — it's clever but hard to read
# Explicit loops or comprehensions are often clearer
```

---

## Lambda Functions: Good and Bad Uses

Lambdas are anonymous single-expression functions. They shine as short callback arguments; they become a liability for anything complex.

```python
# GOOD — sort key: clear and concise
data = [{"name": "Charlie", "age": 30}, {"name": "Alice", "age": 25}]
data.sort(key=lambda x: x["age"])
print([d["name"] for d in data])   # ['Alice', 'Charlie']

# Sort by multiple fields: age asc, name desc
data.sort(key=lambda x: (x["age"], x["name"]))

# GOOD — used inline with map/filter when func is trivial
nums = [1, 2, 3, 4, 5]
print(list(map(lambda x: x**2, nums)))   # [1, 4, 9, 16, 25]

# BAD — assigning a lambda to a name (use def instead)
# bad:
square = lambda x: x**2

# good:
def square(x):
    return x**2

# BAD — complex multi-expression logic in a lambda
# This is unreadable and untestable:
# process = lambda x: x.strip().lower().replace("-", "_") if x else ""

# GOOD — use a named function
def normalize_slug(s: str) -> str:
    if not s:
        return ""
    return s.strip().lower().replace("-", "_")
```

---

## functools.partial: Partial Application

`partial` creates a new function with some arguments pre-filled.

```python
from functools import partial

def power(base: float, exponent: float) -> float:
    return base ** exponent

square  = partial(power, exponent=2)
cube    = partial(power, exponent=3)
sqrt    = partial(power, exponent=0.5)

print(square(4))    # 16.0
print(cube(3))      # 27.0
print(sqrt(16))     # 4.0

# partial with built-ins
from functools import partial

# Create a print that always includes a timestamp prefix
import datetime
def log(message: str, level: str = "INFO", prefix: str = "") -> None:
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {prefix}{message}")

log_error = partial(log, level="ERROR", prefix="!! ")
log_debug = partial(log, level="DEBUG")

log_error("Database connection failed")
log_debug("Query took 0.34ms")

# Real use: building a configurable URL fetcher
import urllib.request

def fetch_url(url: str, timeout: int = 30, retries: int = 3) -> bytes:
    # simplified
    pass

fast_fetch = partial(fetch_url, timeout=5, retries=1)
reliable_fetch = partial(fetch_url, timeout=60, retries=5)

# partial in sorted
from operator import attrgetter, itemgetter

people = [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
by_age  = partial(sorted, key=itemgetter("age"))
by_name = partial(sorted, key=itemgetter("name"))

print([p["name"] for p in by_age(people)])    # ['Bob', 'Alice']
print([p["name"] for p in by_name(people)])   # ['Alice', 'Bob']
```

---

## Function Composition

Composing functions means chaining outputs to inputs: `f(g(h(x)))`.

```python
from functools import reduce
from typing import Callable, TypeVar

T = TypeVar("T")

def compose(*funcs: Callable) -> Callable:
    """Return a function that applies funcs right-to-left."""
    def composed(x):
        return reduce(lambda v, f: f(v), reversed(funcs), x)
    return composed

def pipe(*funcs: Callable) -> Callable:
    """Return a function that applies funcs left-to-right (more readable)."""
    def piped(x):
        return reduce(lambda v, f: f(v), funcs, x)
    return piped

# Example: text processing pipeline
strip  = str.strip
lower  = str.lower
import re
remove_punct = lambda s: re.sub(r"[^\w\s]", "", s)
to_words     = str.split

normalize = pipe(strip, lower, remove_punct, to_words)
print(normalize("  Hello, World! It's GREAT.  "))
# ['hello', 'world', 'its', 'great']

# Compose math transforms
add_one  = lambda x: x + 1
double   = lambda x: x * 2
square   = lambda x: x ** 2

# Right-to-left: square first, then double, then add_one
transform = compose(add_one, double, square)
print(transform(3))   # (3^2) * 2 + 1 = 19

# Left-to-right with pipe:
transform2 = pipe(square, double, add_one)
print(transform2(3))  # same: 19
```

---

## Pure Functions and Side Effects

A **pure function** always returns the same output for the same input and has no observable side effects (no I/O, no mutation of external state).

```python
# Pure — easy to test, cache, parallelize
def calculate_tax(income: float, rate: float) -> float:
    return income * rate

# Impure — depends on external state, hard to test in isolation
TAX_RATE = 0.2
def calculate_tax_impure(income: float) -> float:
    return income * TAX_RATE   # depends on global state

# Avoid mutating arguments
def bad_normalize(lst: list) -> list:
    lst.sort()       # MUTATES the caller's list!
    return lst

def good_normalize(lst: list) -> list:
    return sorted(lst)   # returns a new sorted list

original = [3, 1, 4, 1, 5]
result = good_normalize(original)
print(original)   # [3, 1, 4, 1, 5]  — unchanged
print(result)     # [1, 1, 3, 4, 5]

# Testing pure functions is trivial — no mocking needed
def test_calculate_tax():
    assert calculate_tax(100_000, 0.2) == 20_000.0
    assert calculate_tax(0, 0.2) == 0.0
    assert calculate_tax(50_000, 0.0) == 0.0
```

---

## Immutability Patterns

```python
# Prefer tuple over list for fixed collections
ALLOWED_METHODS = ("GET", "POST", "PUT", "PATCH", "DELETE")
# ALLOWED_METHODS.append("HACK")  # AttributeError — immutable

# frozenset for immutable set membership
STOP_WORDS = frozenset({"the", "a", "an", "is", "it", "in", "on", "at"})

def extract_keywords(text: str) -> list[str]:
    words = text.lower().split()
    return [w for w in words if w not in STOP_WORDS]

print(extract_keywords("The cat is sitting on a mat"))
# ['cat', 'sitting', 'mat']
```

---

## Real-World Pipeline: Transforming User Data

```python
from typing import TypedDict

class User(TypedDict):
    name: str
    email: str
    active: bool
    score: float

users: list[User] = [
    {"name": "Alice Smith",  "email": "alice@example.com", "active": True,  "score": 92.5},
    {"name": "Bob Jones",    "email": "bob@example.com",   "active": False, "score": 78.0},
    {"name": "carol white",  "email": "carol@example.com", "active": True,  "score": 85.3},
    {"name": "Dave Brown",   "email": "dave@example.com",  "active": True,  "score": 61.0},
    {"name": "Eve Davis",    "email": "eve@example.com",   "active": False, "score": 95.1},
]

# Step 1: filter — keep only active users
active = filter(lambda u: u["active"], users)

# Step 2: map — normalize name, extract first name only
def normalize_user(u: User) -> dict:
    return {
        "name":  u["name"].strip().title().split()[0],
        "email": u["email"].lower(),
        "score": round(u["score"], 1),
    }
normalized = map(normalize_user, active)

# Step 3: filter — keep only users with score >= 70
qualified = filter(lambda u: u["score"] >= 70.0, normalized)

# Step 4: sort — highest score first
result = sorted(qualified, key=lambda u: u["score"], reverse=True)

for r in result:
    print(f"  {r['name']:<10} {r['score']:>6.1f}  {r['email']}")

# Output:
#   Carol        85.3  carol@example.com
#   Alice        92.5  alice@example.com
# (sorted by score desc)

# The same pipeline as a single comprehension — sometimes clearer
result_lc = sorted(
    (
        {"name": u["name"].strip().title().split()[0],
         "email": u["email"].lower(),
         "score": round(u["score"], 1)}
        for u in users
        if u["active"] and u["score"] >= 70.0
    ),
    key=lambda u: u["score"],
    reverse=True,
)
```

---

## Key Takeaways

- Functions are **first-class objects** in Python. Assign them, store them in dicts, pass them as arguments.
- `map()` and `filter()` return **lazy iterators**. Wrap in `list()` only when you need all results at once.
- Prefer **list comprehensions** over `map`/`filter` + `lambda` for readability — except when you have a pre-named function to apply.
- `zip()` and `enumerate()` eliminate index-based loops. Prefer them almost always.
- `reduce()` is powerful but hard to read. Use `sum()`, `max()`, `min()`, or an explicit loop when possible.
- **Lambdas** are for short, inline callbacks — especially sort keys. For anything more than one expression, write a named function.
- `functools.partial` is excellent for creating specialised versions of general functions without subclassing.
- **Pure functions** are easier to test, cache (`functools.lru_cache`), and reason about. Push side effects to the edges of your program.
- Pass `tuple` or `frozenset` when you want to communicate that a collection should not be mutated.
