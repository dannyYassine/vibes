---
title: "The Python Data Model"
description: "Understand dunder methods and how Python's data model powers its elegance."
duration_minutes: 35
order: 5
---

## The Python Data Model

The Python data model is the set of rules that govern how objects interact with the language itself — operators, `len()`, `for` loops, `with` statements, and more. By implementing "dunder" (double-underscore) methods, you plug your own classes into the language machinery, making them feel native.

---

## Everything Is an Object

In Python, integers, strings, functions, modules, and classes are all objects. Every object has a type, an identity, and a value. Operators are syntactic sugar for method calls:

```python
a = 10
b = 3

# These are identical:
print(a + b)            # 13
print(a.__add__(b))     # 13

# len() calls __len__
lst = [1, 2, 3]
print(len(lst))         # 3
print(lst.__len__())    # 3

# "in" calls __contains__
print(2 in lst)         # True
print(lst.__contains__(2))  # True
```

When you implement dunders, Python calls them automatically in response to syntax.

---

## __repr__ vs __str__

These two methods both produce string representations, but serve different audiences.

- `__repr__` — for developers. Should be **unambiguous**. The goal is to produce a string that, if possible, could recreate the object. Used in the REPL and `repr()`.
- `__str__` — for end users. Should be **readable**. Used by `print()` and `str()`.

If only `__repr__` is defined, Python uses it for both.

```python
from datetime import datetime

class LogEntry:
    def __init__(self, level: str, message: str, timestamp: datetime = None):
        self.level = level.upper()
        self.message = message
        self.timestamp = timestamp or datetime.now()

    def __repr__(self) -> str:
        # Should be unambiguous — ideally reconstructable
        return (
            f"LogEntry(level={self.level!r}, "
            f"message={self.message!r}, "
            f"timestamp={self.timestamp!r})"
        )

    def __str__(self) -> str:
        # Human-readable format
        ts = self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        return f"[{ts}] {self.level}: {self.message}"

entry = LogEntry("error", "Database connection failed")
print(repr(entry))
# LogEntry(level='ERROR', message='Database connection failed', timestamp=datetime.datetime(...))

print(str(entry))
# [2024-01-15 10:30:22] ERROR: Database connection failed

print(entry)       # calls __str__
entries = [entry]
print(entries)     # calls __repr__ on each element
```

---

## Making Custom Sequences: __len__, __getitem__, __setitem__, __delitem__, __contains__

```python
class BoundedList:
    """A list that enforces a maximum length."""

    def __init__(self, max_size: int):
        self.max_size = max_size
        self._data: list = []

    def __len__(self) -> int:
        return len(self._data)

    def __getitem__(self, index):
        return self._data[index]   # passes slices through too

    def __setitem__(self, index, value):
        self._data[index] = value

    def __delitem__(self, index):
        del self._data[index]

    def __contains__(self, item) -> bool:
        return item in self._data

    def __repr__(self) -> str:
        return f"BoundedList(max_size={self.max_size}, data={self._data!r})"

    def append(self, item) -> None:
        if len(self._data) >= self.max_size:
            raise OverflowError(f"BoundedList is full (max={self.max_size})")
        self._data.append(item)

bl = BoundedList(max_size=3)
bl.append(10)
bl.append(20)
bl.append(30)

print(len(bl))         # 3
print(bl[0])           # 10
print(bl[-1])          # 30
print(bl[1:])          # [20, 30]  — slicing works via __getitem__
print(20 in bl)        # True
print(99 in bl)        # False

bl[0] = 100
del bl[0]
print(bl)              # BoundedList(max_size=3, data=[20, 30])

for item in bl:        # iteration works via __getitem__! (fallback)
    print(item)
```

---

## __iter__ and __next__: The Iterator Protocol

An **iterable** has `__iter__` that returns an **iterator**. An **iterator** has both `__iter__` (returns self) and `__next__` (returns next value or raises `StopIteration`).

```python
class Countdown:
    """An iterator that counts down from n to 1."""

    def __init__(self, start: int):
        self.start = start

    def __iter__(self):
        # Return the iterator object (self in this case)
        self.current = self.start
        return self

    def __next__(self) -> int:
        if self.current <= 0:
            raise StopIteration
        val = self.current
        self.current -= 1
        return val

    def __repr__(self) -> str:
        return f"Countdown({self.start})"

cd = Countdown(5)
for n in cd:
    print(n, end=" ")   # 5 4 3 2 1

# Can iterate again — __iter__ resets state
print(list(Countdown(3)))   # [3, 2, 1]

# Manually drive the iterator
it = iter(Countdown(3))
print(next(it))   # 3
print(next(it))   # 2
print(next(it))   # 1
# next(it)        # StopIteration

# Separating the iterable from the iterator
class FibSequence:
    """Iterable that creates a fresh iterator each time."""
    def __init__(self, limit: int):
        self.limit = limit

    def __iter__(self):
        return FibIterator(self.limit)

class FibIterator:
    def __init__(self, limit: int):
        self.limit = limit
        self.a, self.b = 0, 1

    def __iter__(self):
        return self

    def __next__(self) -> int:
        if self.a > self.limit:
            raise StopIteration
        val = self.a
        self.a, self.b = self.b, self.a + self.b
        return val

fibs = FibSequence(100)
print(list(fibs))   # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
print(list(fibs))   # same — fresh iterator created each time
```

---

## __call__: Callable Objects

Implementing `__call__` makes instances callable like functions.

```python
class RateLimiter:
    """A callable object that rate-limits a function by sleeping."""
    import time

    def __init__(self, max_calls: int, period: float):
        self.max_calls = max_calls
        self.period = period
        self._calls: list[float] = []

    def __call__(self, func):
        """Use as a decorator."""
        import functools, time

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            now = time.monotonic()
            # Remove calls outside the window
            self._calls = [t for t in self._calls if now - t < self.period]
            if len(self._calls) >= self.max_calls:
                sleep_for = self.period - (now - self._calls[0])
                if sleep_for > 0:
                    time.sleep(sleep_for)
            self._calls.append(time.monotonic())
            return func(*args, **kwargs)
        return wrapper

# Simple callable object example
class Adder:
    def __init__(self, n: int):
        self.n = n

    def __call__(self, x: int) -> int:
        return x + self.n

    def __repr__(self) -> str:
        return f"Adder({self.n})"

add5 = Adder(5)
print(add5(10))    # 15
print(add5(20))    # 25
print(callable(add5))   # True

# Callable objects preserve state between calls
class Counter:
    def __init__(self):
        self.count = 0

    def __call__(self) -> int:
        self.count += 1
        return self.count

counter = Counter()
print(counter())   # 1
print(counter())   # 2
print(counter())   # 3
```

---

## __enter__ and __exit__: Context Managers from Scratch

Context managers power the `with` statement.

```python
import time

class Timer:
    """Context manager that measures elapsed time."""

    def __enter__(self):
        self.start = time.perf_counter()
        return self   # bound to the `as` variable

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = time.perf_counter() - self.start
        print(f"Elapsed: {self.elapsed:.4f}s")
        # Return True to suppress exceptions, False (or None) to propagate them
        return False

with Timer() as t:
    total = sum(range(1_000_000))
# Elapsed: 0.0234s

print(f"Total: {total}, took {t.elapsed:.4f}s")

# Exception handling in __exit__
class SuppressErrors:
    """Context manager that silently swallows specific exception types."""

    def __init__(self, *exception_types):
        self.exception_types = exception_types

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # exc_type, exc_val, exc_tb are None if no exception occurred
        if exc_type is not None and issubclass(exc_type, self.exception_types):
            print(f"Suppressed {exc_type.__name__}: {exc_val}")
            return True   # suppress the exception
        return False      # propagate all other exceptions

with SuppressErrors(FileNotFoundError, KeyError):
    open("/nonexistent/file.txt")   # FileNotFoundError — suppressed
print("Execution continues after context manager")

# contextlib.contextmanager — generator-based alternative
from contextlib import contextmanager

@contextmanager
def managed_resource(name: str):
    print(f"Acquiring {name}")
    resource = {"name": name, "active": True}
    try:
        yield resource            # value bound to `as` variable
    except Exception as e:
        print(f"Error during {name}: {e}")
        raise
    finally:
        resource["active"] = False
        print(f"Releasing {name}")

with managed_resource("database connection") as conn:
    print(f"Using {conn['name']}")
# Output:
# Acquiring database connection
# Using database connection
# Releasing database connection
```

---

## Numeric Dunders: __add__, __radd__, __iadd__, __mul__, __neg__

```python
class Money:
    def __init__(self, amount: float, currency: str = "USD"):
        self.amount = round(float(amount), 2)
        self.currency = currency

    def __repr__(self) -> str:
        return f"Money({self.amount}, {self.currency!r})"

    def __str__(self) -> str:
        return f"{self.currency} {self.amount:.2f}"

    # Called for: money + money
    def __add__(self, other):
        if isinstance(other, Money):
            if self.currency != other.currency:
                raise ValueError(f"Cannot add {self.currency} and {other.currency}")
            return Money(self.amount + other.amount, self.currency)
        return NotImplemented   # let Python try other's __radd__

    # Called for: 10 + money (when int.__add__ returns NotImplemented)
    def __radd__(self, other):
        if isinstance(other, (int, float)):
            return Money(self.amount + other, self.currency)
        return NotImplemented

    # Called for: money += other
    def __iadd__(self, other):
        if isinstance(other, Money):
            if self.currency != other.currency:
                raise ValueError(...)
            self.amount = round(self.amount + other.amount, 2)
            return self
        return NotImplemented

    # Scalar multiplication: money * 3 or 3 * money
    def __mul__(self, factor):
        if isinstance(factor, (int, float)):
            return Money(self.amount * factor, self.currency)
        return NotImplemented

    def __rmul__(self, factor):
        return self.__mul__(factor)

    # Unary negation: -money
    def __neg__(self):
        return Money(-self.amount, self.currency)

    # Absolute value: abs(money)
    def __abs__(self):
        return Money(abs(self.amount), self.currency)

price = Money(9.99)
tax   = Money(0.80)
print(price + tax)         # USD 10.79
print(price * 3)           # USD 29.97
print(3 * price)           # USD 29.97  (uses __rmul__)
print(-price)              # USD -9.99
print(abs(-price))         # USD 9.99
print(sum([price, tax, Money(5.00)]))  # sum() starts with 0 + first item
# 0 + Money(9.99) → Money.__radd__(0) → Money(9.99)
```

---

## Comparison Dunders: __eq__, __lt__, __hash__

The **hash/eq contract**: if two objects compare equal (`==`), they must have the same hash. If you define `__eq__`, you must also define `__hash__` (or set it to `None` to make objects unhashable).

```python
class Card:
    SUITS  = ("clubs", "diamonds", "hearts", "spades")
    VALUES = (None, None, "2", "3", "4", "5", "6", "7",
              "8", "9", "10", "J", "Q", "K", "A")

    def __init__(self, suit: str, rank: int):
        if suit not in self.SUITS:
            raise ValueError(f"Invalid suit: {suit}")
        if rank < 2 or rank > 14:
            raise ValueError(f"Invalid rank: {rank}")
        self.suit = suit
        self.rank = rank

    def __repr__(self) -> str:
        return f"Card({self.suit!r}, {self.rank})"

    def __str__(self) -> str:
        return f"{self.VALUES[self.rank]} of {self.suit}"

    def __eq__(self, other) -> bool:
        if not isinstance(other, Card):
            return NotImplemented
        return self.suit == other.suit and self.rank == other.rank

    def __lt__(self, other) -> bool:
        if not isinstance(other, Card):
            return NotImplemented
        return self.rank < other.rank

    def __hash__(self) -> int:
        # Must be consistent with __eq__: equal objects must have equal hashes
        return hash((self.suit, self.rank))

    def __bool__(self) -> bool:
        # "Truthiness" — face cards are truthy; low cards are falsy (arbitrary example)
        return self.rank >= 11

hand = [Card("hearts", 10), Card("spades", 14), Card("diamonds", 7)]
print(sorted(hand))   # sorted by rank

card_set = {Card("hearts", 10), Card("hearts", 10)}
print(len(card_set))   # 1 — duplicates removed (uses __hash__ and __eq__)

print(bool(Card("hearts", 14)))   # True (Ace)
print(bool(Card("clubs",  2)))    # False
```

---

## Attribute Access: __getattr__, __getattribute__, __setattr__

```python
class LazyLoader:
    """Load expensive attributes only when first accessed."""

    def __init__(self, config: dict):
        # Use object.__setattr__ to avoid infinite recursion in __setattr__
        object.__setattr__(self, "_config", config)
        object.__setattr__(self, "_cache", {})

    def __getattr__(self, name: str):
        # Called ONLY when normal attribute lookup fails
        cache = object.__getattribute__(self, "_cache")
        if name not in cache:
            config = object.__getattribute__(self, "_config")
            if name not in config:
                raise AttributeError(f"{type(self).__name__!r} has no attribute {name!r}")
            print(f"Loading {name!r}...")
            cache[name] = config[name]   # simulate expensive load
        return cache[name]

    def __setattr__(self, name: str, value):
        # Called for EVERY attribute assignment
        cache = object.__getattribute__(self, "_cache")
        cache[name] = value   # store in cache

loader = LazyLoader({"db_host": "localhost", "db_port": 5432})
print(loader.db_host)   # Loading 'db_host'...  localhost
print(loader.db_host)   # localhost  (cached, no "Loading" message)
print(loader.db_port)   # Loading 'db_port'...  5432
```

Key distinction:
- `__getattr__` — called when **normal lookup fails** (attribute not found)
- `__getattribute__` — called for **every attribute access**, even existing ones. Easy to cause infinite recursion; always call `object.__getattribute__` inside it.

---

## __slots__ Interaction with the Data Model

```python
class SlottedPoint:
    __slots__ = ("x", "y")

    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"SlottedPoint({self.x}, {self.y})"

    def __iter__(self):
        yield self.x
        yield self.y

p = SlottedPoint(3.0, 4.0)
x, y = p              # works because of __iter__
print(x, y)           # 3.0 4.0

# No __dict__ — attempting to add arbitrary attributes fails
try:
    p.z = 5.0
except AttributeError as e:
    print(e)   # 'SlottedPoint' object has no attribute 'z'
```

---

## Complete Example: Vector2D

Putting it all together in a single class that implements the full data model:

```python
import math
from typing import Iterator

class Vector2D:
    """A 2D vector with full data model support."""

    __slots__ = ("x", "y")

    def __init__(self, x: float, y: float):
        self.x = float(x)
        self.y = float(y)

    # -------- String representations --------
    def __repr__(self) -> str:
        return f"Vector2D({self.x!r}, {self.y!r})"

    def __str__(self) -> str:
        return f"({self.x:.2f}, {self.y:.2f})"

    # -------- Iteration and sequence-like --------
    def __iter__(self) -> Iterator[float]:
        yield self.x
        yield self.y

    def __len__(self) -> int:
        return 2

    def __getitem__(self, index: int) -> float:
        return (self.x, self.y)[index]

    # -------- Arithmetic --------
    def __add__(self, other: "Vector2D") -> "Vector2D":
        if not isinstance(other, Vector2D):
            return NotImplemented
        return Vector2D(self.x + other.x, self.y + other.y)

    def __sub__(self, other: "Vector2D") -> "Vector2D":
        if not isinstance(other, Vector2D):
            return NotImplemented
        return Vector2D(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar: float) -> "Vector2D":
        if isinstance(scalar, (int, float)):
            return Vector2D(self.x * scalar, self.y * scalar)
        return NotImplemented

    def __rmul__(self, scalar: float) -> "Vector2D":
        return self.__mul__(scalar)

    def __neg__(self) -> "Vector2D":
        return Vector2D(-self.x, -self.y)

    def __abs__(self) -> float:
        """Return the magnitude (length) of the vector."""
        return math.hypot(self.x, self.y)

    def __bool__(self) -> bool:
        """A zero vector is falsy."""
        return bool(self.x or self.y)

    # -------- Comparison --------
    def __eq__(self, other) -> bool:
        if not isinstance(other, Vector2D):
            return NotImplemented
        return math.isclose(self.x, other.x) and math.isclose(self.y, other.y)

    def __hash__(self) -> int:
        return hash((self.x, self.y))

    # -------- Domain methods --------
    def dot(self, other: "Vector2D") -> float:
        return self.x * other.x + self.y * other.y

    def normalize(self) -> "Vector2D":
        mag = abs(self)
        if mag == 0:
            raise ValueError("Cannot normalize the zero vector")
        return Vector2D(self.x / mag, self.y / mag)

    def angle(self, other: "Vector2D") -> float:
        """Angle in degrees between this vector and other."""
        cos_theta = self.dot(other) / (abs(self) * abs(other))
        return math.degrees(math.acos(max(-1.0, min(1.0, cos_theta))))


# Demonstration
v1 = Vector2D(3, 4)
v2 = Vector2D(1, 0)

print(repr(v1))         # Vector2D(3.0, 4.0)
print(str(v1))          # (3.00, 4.00)
print(abs(v1))          # 5.0  (magnitude)
print(v1 + v2)          # (4.00, 4.00)
print(v1 - v2)          # (2.00, 4.00)
print(v1 * 2)           # (6.00, 8.00)
print(3 * v1)           # (9.00, 12.00)  (rmul)
print(-v1)              # (-3.00, -4.00)
print(bool(v1))         # True
print(bool(Vector2D(0, 0)))  # False

x, y = v1               # unpacking via __iter__
print(x, y)             # 3.0 4.0

# Hashable — usable as dict key
distances = {v1: 5.0, v2: 1.0}
print(distances[Vector2D(3, 4)])   # 5.0

# angle
print(f"{v1.angle(v2):.1f}°")    # 53.1° (arctan(4/3))
```

---

## Key Takeaways

- **The data model** lets your classes integrate with Python syntax: `+`, `len()`, `for`, `with`, `in`, `[]`, `bool()`, etc.
- Implement `__repr__` always. Add `__str__` when a user-facing representation differs from the debug one.
- The **iterator protocol** requires `__iter__` (returns `self`) and `__next__` (returns next value or raises `StopIteration`).
- The **hash/eq contract**: if you define `__eq__`, you must define `__hash__`. Equal objects must have equal hashes.
- Return `NotImplemented` (not `NotImplementedError`) from numeric/comparison dunders when the type is unsupported — this lets Python try the reflected method on the other object.
- `__getattr__` fires only when an attribute is not found. `__getattribute__` fires on every access — be careful to call `object.__getattribute__` inside to avoid infinite recursion.
- `__enter__` / `__exit__` build context managers. `__exit__` receives exception info and can suppress exceptions by returning `True`.
- A complete, self-contained data type like `Vector2D` becomes genuinely Pythonic through the data model — it behaves like a built-in type.
