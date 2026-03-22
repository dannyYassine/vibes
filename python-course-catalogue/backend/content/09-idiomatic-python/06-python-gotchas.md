---
title: "Common Python Gotchas & How to Avoid Them"
description: "Understand and avoid the most common Python traps that trip up developers."
duration_minutes: 25
order: 6
---

## Overview

Python is designed to be readable and predictable, but certain language behaviors surprise even experienced developers. These are not bugs — they are consequences of deliberate design decisions. Understanding why each gotcha exists helps you remember the fix.

---

## 1. Mutable Default Arguments

**The problem**: default argument values are evaluated *once* when the function is defined, not each time the function is called.

```python
# BROKEN — the list is created ONCE at definition time
def append_item(item, container=[]):
    container.append(item)
    return container

print(append_item("a"))   # ['a']
print(append_item("b"))   # ['a', 'b']  ← surprise! reuses the same list
print(append_item("c"))   # ['a', 'b', 'c']
```

**Why it happens**: Python creates function default values at `def` time and stores them in `func.__defaults__`. Every call that omits the argument shares the same object.

**The fix**: use `None` as the sentinel and create a fresh object inside the function.

```python
# CORRECT
def append_item(item, container=None):
    if container is None:
        container = []
    container.append(item)
    return container

print(append_item("a"))   # ['a']
print(append_item("b"))   # ['b']  ← independent list
```

**What is okay to use as a default**: immutable objects — strings, integers, tuples, `None`, `True`/`False`. These cannot be mutated, so sharing is safe.

```python
def greet(name, prefix="Hello"):   # fine — str is immutable
    return f"{prefix}, {name}!"
```

---

## 2. Late Binding Closures

**The problem**: closures in Python capture *variables* (references), not *values*. By the time the closure is called, the variable may have changed.

```python
# BROKEN — all lambdas see the final value of i
functions = []
for i in range(3):
    functions.append(lambda: i)

print([f() for f in functions])   # [2, 2, 2]  ← expected [0, 1, 2]
```

**Why it happens**: each lambda closes over the variable `i` in the enclosing scope. By the time any lambda is called, the loop is done and `i = 2`.

**The fix**: capture the current value as a default argument.

```python
# CORRECT — default arg is evaluated at definition time
functions = []
for i in range(3):
    functions.append(lambda i=i: i)   # i=i captures current value

print([f() for f in functions])   # [0, 1, 2]
```

**Alternative fix**: use `functools.partial`.

```python
from functools import partial

def make_func(value):
    return lambda: value

functions = [make_func(i) for i in range(3)]
print([f() for f in functions])   # [0, 1, 2]
```

This also applies to closures in nested functions, class definitions in loops, and `functools.partial`.

---

## 3. Chained List Multiplication

**The problem**: `[[0] * cols] * rows` creates multiple references to the same inner list.

```python
# BROKEN — all rows are the same list object
grid = [[0] * 3] * 3

grid[0][0] = 1
print(grid)   # [[1, 0, 0], [1, 0, 0], [1, 0, 0]]  ← all rows changed!
```

**Why it happens**: `[list_obj] * 3` creates a list of three references to the *same* `list_obj`. Modifying through any of them modifies all of them.

**The fix**: use a list comprehension to create independent inner lists.

```python
# CORRECT — each row is a distinct list object
grid = [[0] * 3 for _ in range(3)]

grid[0][0] = 1
print(grid)   # [[1, 0, 0], [0, 0, 0], [0, 0, 0]]  ← only first row changed

# Verify they are distinct objects
grid = [[0] * 3 for _ in range(3)]
print(grid[0] is grid[1])   # False — independent lists
```

**When multiplication is safe**: multiplying a list of *immutable* values is fine, because you cannot mutate an immutable object in place.

```python
row = [0] * 100    # fine — ints are immutable, each 0 is effectively independent
```

---

## 4. Integer Identity: CPython Caches -5 to 256

**The problem**: CPython interns (caches) small integers in the range -5 to 256 as singletons. `is` comparisons between these integers unexpectedly return `True`.

```python
a = 256
b = 256
print(a is b)   # True  — same cached object

a = 257
b = 257
print(a is b)   # False — different objects (may be True in some contexts though)

a = 1000
b = 1000
print(a is b)   # False in most contexts
```

**Why it matters**: this behavior is a CPython implementation detail, not guaranteed by the language specification. Code that relies on it is fragile and non-portable.

**The rule**: **never use `is` to compare integers (or any value type)**. Use `==`.

```python
# WRONG — relies on implementation detail
if user_id is 0:    # may work for small IDs, breaks for large ones
    ...

# CORRECT — always use == for value comparison
if user_id == 0:
    ...
```

`is` should only be used for identity checks against singletons: `None`, `True`, `False`, and occasionally sentinel objects you create yourself.

```python
# Correct uses of is
if result is None:
    ...

_MISSING = object()   # private sentinel
def get_value(key, default=_MISSING):
    value = cache.get(key)
    if value is _MISSING:    # comparing with the exact sentinel object
        ...
```

---

## 5. Float Precision

**The problem**: floating-point numbers cannot represent most decimal fractions exactly.

```python
print(0.1 + 0.2)          # 0.30000000000000004
print(0.1 + 0.2 == 0.3)   # False
```

**Why it happens**: `0.1`, `0.2`, and `0.3` have no exact binary floating-point representation. The stored values are the nearest representable binary fractions, and they accumulate rounding error.

**Fixes**:

```python
import math
from decimal import Decimal, getcontext

# Fix 1: math.isclose() — compare within a tolerance
print(math.isclose(0.1 + 0.2, 0.3))           # True
print(math.isclose(0.1 + 0.2, 0.3, rel_tol=1e-9))   # True

# Fix 2: round() before comparing (lossy but often sufficient)
print(round(0.1 + 0.2, 10) == round(0.3, 10))  # True

# Fix 3: decimal.Decimal for exact decimal arithmetic (finance, accounting)
getcontext().prec = 28
result = Decimal("0.1") + Decimal("0.2")
print(result)             # 0.3  (exact)
print(result == Decimal("0.3"))   # True

# Decimal is slower than float — use it only when decimal exactness is required
price   = Decimal("19.99")
tax     = Decimal("0.08")
total   = price + price * tax
print(total)   # 21.5892  (exact)
```

---

## 6. is vs ==

Already touched on in gotcha 4, but worth the full treatment:

```python
# == tests VALUE equality (calls __eq__)
[1, 2, 3] == [1, 2, 3]   # True  — same contents
"hello" == "hello"         # True  — same characters

# is tests IDENTITY (same object in memory)
a = [1, 2, 3]
b = [1, 2, 3]
print(a == b)   # True  — same contents
print(a is b)   # False — different objects

b = a
print(a is b)   # True  — same object (b is an alias for a)

# The only correct uses of is:
x is None     # checking for None
x is True     # rare — usually == is better
x is False    # rare
x is SENTINEL # your own sentinel object

# Common mistake
name = "Alice"
if name is "Alice":   # SyntaxWarning in Python 3.8+, wrong regardless
    ...
if name == "Alice":   # correct
    ...
```

---

## 7. Exception Variable Scope

**The problem**: the variable bound to an exception in an `except` clause is deleted after the block ends.

```python
try:
    raise ValueError("something went wrong")
except ValueError as e:
    message = str(e)   # save what you need BEFORE the block ends

# e is DELETED here (Python 3 behavior)
try:
    print(e)   # NameError: name 'e' is not defined
except NameError:
    print("e is gone")

# print(message)   # This works — message is a regular variable
```

**Why it happens**: Python 3 deletes the exception variable after the `except` block to avoid reference cycles (the traceback references frames that reference local variables).

**The fix**: extract what you need inside the `except` block.

```python
saved_error = None
try:
    risky_operation()
except ValueError as e:
    saved_error = e     # capture before it disappears
    logger.error("Operation failed: %s", e)

if saved_error is not None:
    handle_error(saved_error)   # use it later
```

---

## 8. Circular Imports

**The problem**: module A imports module B, and module B imports module A. Python partially executes A, then tries to execute B which tries to import A again — but A is only partially initialized.

```python
# models.py
from services import get_user   # imports services

# services.py
from models import User         # imports models — CIRCULAR!
```

**Why it happens**: Python executes module files top-to-bottom. When a circular import occurs, the second module gets a partially-initialized version of the first.

**Fix 1**: restructure — put shared types in a third module.

```python
# types.py — no imports from models or services
class User: ...

# models.py
from types_module import User   # no circular dependency

# services.py
from types_module import User   # no circular dependency
```

**Fix 2**: import inside the function (lazy import).

```python
# services.py
def get_user(user_id: int):
    from models import User    # import deferred until function call
    return User.query.get(user_id)
```

**Fix 3**: use `TYPE_CHECKING` guard for type annotations only.

```python
from __future__ import annotations   # PEP 563: evaluate annotations lazily
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models import User   # only imported when type-checking, not at runtime

def process(user: "User") -> None:   # forward reference
    ...
```

---

## 9. Class Variable vs Instance Variable

**The problem**: a mutable class variable is shared among all instances.

```python
# BROKEN — items is a class variable, shared by ALL instances
class ShoppingCart:
    items = []   # defined at class level

cart1 = ShoppingCart()
cart2 = ShoppingCart()

cart1.items.append("apple")
print(cart2.items)   # ['apple']  ← cart2's list was modified too!
```

**Why it happens**: `items = []` in the class body creates one list on the class, not one per instance. `cart1.items` and `cart2.items` look up the same attribute through the MRO.

**The fix**: initialize mutable attributes in `__init__`.

```python
# CORRECT — each instance gets its own list
class ShoppingCart:
    def __init__(self):
        self.items = []   # instance variable

cart1 = ShoppingCart()
cart2 = ShoppingCart()

cart1.items.append("apple")
print(cart2.items)   # []  ← unaffected
```

**When class variables are appropriate**: immutable constants shared by all instances.

```python
class Config:
    MAX_RETRIES: int = 3         # fine — int is immutable
    DEFAULT_TIMEOUT: float = 30  # fine
    ALLOWED_METHODS: tuple = ("GET", "POST")  # fine — tuple is immutable
```

---

## 10. The global Keyword

**The problem**: assigning to a name inside a function creates a new local variable, even if a global with that name exists.

```python
count = 0

def increment():
    count += 1   # UnboundLocalError: local variable 'count' referenced before assignment

increment()
```

**Why it happens**: Python sees the assignment `count += 1` and treats `count` as a local variable for the entire function — but then tries to read it before it has been assigned locally.

**The fix**: declare the variable as global, or (better) redesign to avoid mutable global state.

```python
# Fix with global
count = 0
def increment():
    global count
    count += 1

# Better fix — use a return value
def increment(count: int) -> int:
    return count + 1

count = increment(count)

# Best fix — encapsulate in a class or use a mutable container
class Counter:
    def __init__(self):
        self.value = 0
    def increment(self):
        self.value += 1
```

`nonlocal` works similarly for closures (access a variable from an enclosing function scope):

```python
def make_counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    return increment

counter = make_counter()
print(counter())  # 1
print(counter())  # 2
```

---

## 11. Modifying a dict or list During Iteration

**The problem**: changing the size of a dict or list while iterating over it raises `RuntimeError`.

```python
data = {"a": 1, "b": 2, "c": 3, "d": 4}

# BROKEN — RuntimeError: dictionary changed size during iteration
for key, value in data.items():
    if value < 3:
        del data[key]

# BROKEN for lists too (doesn't crash, but skips elements)
items = [1, 2, 3, 4, 5, 6]
for item in items:
    if item % 2 == 0:
        items.remove(item)   # skips elements!
print(items)   # [1, 3, 5]  — looks right by accident, but remove() is O(n)
```

**The fix for dicts**: iterate over a copy of the keys.

```python
# CORRECT for dicts
data = {"a": 1, "b": 2, "c": 3, "d": 4}
to_delete = [k for k, v in data.items() if v < 3]
for key in to_delete:
    del data[key]

# Or build a new dict
data = {k: v for k, v in data.items() if v >= 3}
print(data)   # {'c': 3, 'd': 4}
```

**The fix for lists**: build a new list with a comprehension.

```python
# CORRECT for lists
items = [1, 2, 3, 4, 5, 6]
items = [item for item in items if item % 2 != 0]
print(items)   # [1, 3, 5]
```

---

## 12. StopIteration Inside Generators

**The problem**: in Python 3.7+, `StopIteration` raised inside a generator is converted to `RuntimeError` (PEP 479). This breaks code that tried to use `StopIteration` to signal the end of a generator.

```python
def bad_generator():
    yield 1
    raise StopIteration   # RuntimeError in Python 3.7+!

# Why this used to appear: calling next() on a sub-iterator
def flatten(nested):
    for item in nested:
        try:
            sub = iter(item)
            while True:
                yield next(sub)   # next() raises StopIteration — now RuntimeError!
        except TypeError:
            yield item
```

**The fix**: use `return` to end a generator, and `for` loops instead of `next()`.

```python
def bad_generator():
    yield 1
    return   # correct — signals generator exhaustion cleanly

def flatten(nested):
    for item in nested:
        try:
            sub = iter(item)
            yield from sub   # yield from handles StopIteration correctly
        except TypeError:
            yield item
```

---

## 13. Shallow Copy Pitfall

**The problem**: `list.copy()`, `list[:]`, and `copy.copy()` create a new container but do not copy the nested objects.

```python
import copy

original = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

# Shallow copy — new list, same inner lists
shallow = original.copy()       # or original[:]
shallow[0][0] = 99              # modifies the SHARED inner list!

print(original[0])   # [99, 2, 3]  ← original was modified!
print(shallow[0])    # [99, 2, 3]  ← same object

# Verify they are different outer lists but same inner lists
print(shallow is original)       # False — different outer list
print(shallow[0] is original[0]) # True  — same inner list!
```

**The fix**: use `copy.deepcopy()` for nested structures.

```python
import copy

original = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
deep = copy.deepcopy(original)

deep[0][0] = 99
print(original[0])   # [1, 2, 3]  ← untouched
print(deep[0])       # [99, 2, 3]
```

**Performance note**: `deepcopy` is recursive and relatively slow. For performance-critical code, consider:
- Constructing fresh objects explicitly
- Using `json.loads(json.dumps(obj))` for JSON-serializable data (faster for simple structures)
- Immutable data structures (`tuple`, `frozenset`, frozen dataclasses) that cannot be accidentally mutated

```python
# Fast deep copy for JSON-compatible data
import json
deep = json.loads(json.dumps(original))
```

---

## Key Takeaways

- **Mutable default arguments** (`def f(x=[])`) are shared across calls. Always use `None` and create fresh objects inside the function.
- **Closures capture variables, not values**. Bind the current value with a default argument (`lambda i=i: i`) or `functools.partial`.
- **`[[0]*3]*3` creates aliases**, not independent rows. Use `[[0]*3 for _ in range(3)]`.
- **Never use `is` for value comparison**. Integer caching (`-5` to `256`) is a CPython implementation detail. Use `==`.
- **Float arithmetic is inexact**. Use `math.isclose()` for comparisons, `decimal.Decimal` for financial calculations.
- **Exception variables (`as e`) are deleted after the `except` block**. Save what you need before the block ends.
- **Circular imports**: restructure into a shared module, use lazy imports inside functions, or use `TYPE_CHECKING` guards for type annotations.
- **Class-level mutable attributes are shared**. Initialize mutable attributes in `__init__`.
- **Never mutate a dict or list while iterating it**. Collect changes and apply them after, or build a new object with a comprehension.
- **`StopIteration` in generators becomes `RuntimeError`** in Python 3.7+. Use `return` to end a generator; use `yield from` instead of `next()` in loops.
- **`list.copy()` and `copy.copy()` are shallow**. Use `copy.deepcopy()` when the structure contains nested mutable objects you need to fully isolate.
