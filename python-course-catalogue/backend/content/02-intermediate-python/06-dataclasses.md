---
title: "Dataclasses"
description: "Use Python dataclasses to write clean, boilerplate-free data container classes."
duration_minutes: 25
order: 6
---

## Dataclasses

Before dataclasses, writing a simple data-holding class in Python required tedious, error-prone boilerplate. The `@dataclass` decorator (Python 3.7+) generates that boilerplate automatically while keeping your code clean and explicit.

---

## The Boilerplate Problem

Consider a simple `Point` class you might write by hand:

```python
class Point:
    def __init__(self, x: float, y: float, z: float = 0.0):
        self.x = x
        self.y = y
        self.z = z

    def __repr__(self):
        return f"Point(x={self.x!r}, y={self.y!r}, z={self.z!r})"

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return (self.x, self.y, self.z) == (other.x, other.y, other.z)

    def __hash__(self):
        return hash((self.x, self.y, self.z))


p1 = Point(1.0, 2.0)
p2 = Point(1.0, 2.0)
print(p1)         # Point(x=1.0, y=2.0, z=0.0)
print(p1 == p2)   # True
```

That is 20+ lines for a 3-field class. With `@dataclass`:

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float
    z: float = 0.0

p1 = Point(1.0, 2.0)
p2 = Point(1.0, 2.0)
print(p1)         # Point(x=1.0, y=2.0, z=0.0)
print(p1 == p2)   # True
```

`@dataclass` generated `__init__`, `__repr__`, and `__eq__` from the type-annotated class variables.

---

## What Gets Generated

```python
from dataclasses import dataclass

@dataclass
class Employee:
    name: str
    department: str
    salary: float
    active: bool = True

e = Employee("Alice", "Engineering", 95000.0)
print(e)
# Employee(name='Alice', department='Engineering', salary=95000.0, active=True)

# __init__ with defaults
e2 = Employee(name="Bob", department="Marketing", salary=72000.0, active=False)

# __eq__ compares field by field
e3 = Employee("Alice", "Engineering", 95000.0)
print(e == e3)    # True

# __repr__ is unambiguous (suitable for debugging)
print(repr(e))    # Employee(name='Alice', department='Engineering', salary=95000.0, active=True)

# NOTE: @dataclass does NOT generate __hash__ when eq=True (the default)
# because mutable objects should not be hashable (hash/eq contract)
# To make it hashable, use frozen=True or unsafe_hash=True
```

---

## field(): Controlling Individual Fields

When a plain type annotation is not enough, use `dataclasses.field()`:

```python
from dataclasses import dataclass, field
from typing import ClassVar

@dataclass
class ShoppingCart:
    owner: str
    # default_factory — used for mutable defaults (list, dict, set)
    items: list[str] = field(default_factory=list)
    # repr=False — hide from __repr__ (passwords, tokens, large objects)
    _session_token: str = field(default="", repr=False)
    # compare=False — exclude from __eq__ and ordering
    created_at: str = field(default="", compare=False)
    # init=False — not a constructor parameter; set in __post_init__
    item_count: int = field(default=0, init=False)

    def __post_init__(self):
        self.item_count = len(self.items)

cart = ShoppingCart(owner="Alice", items=["apple", "bread"])
print(cart)
# ShoppingCart(owner='Alice', items=['apple', 'bread'], created_at='', item_count=2)
# _session_token is hidden from repr

# Common mistake — using a mutable default directly:
# @dataclass
# class Bad:
#     items: list = []   # ValueError: mutable default <class 'list'> for field items
#                        # is not allowed: use default_factory
```

---

## `__post_init__`: Validation and Derived Fields

`__post_init__` is called by the generated `__init__` after all fields are assigned. Use it for validation, derived fields, or side effects.

```python
from dataclasses import dataclass, field
import re

@dataclass
class User:
    username: str
    email: str
    age: int
    # derived field — not a constructor parameter
    email_domain: str = field(init=False, repr=False)

    def __post_init__(self):
        # Validation
        if len(self.username) < 3:
            raise ValueError(f"Username must be at least 3 characters: {self.username!r}")
        if self.age < 0 or self.age > 150:
            raise ValueError(f"Age out of range: {self.age}")
        if "@" not in self.email:
            raise ValueError(f"Invalid email: {self.email!r}")

        # Normalisation
        self.username = self.username.lower().strip()
        self.email = self.email.lower().strip()

        # Derived field
        self.email_domain = self.email.split("@")[1]

try:
    u = User(username="Al", email="alice@example.com", age=30)
except ValueError as e:
    print(e)   # Username must be at least 3 characters: 'Al'

u = User(username="Alice", email="Alice@Example.COM", age=30)
print(u.email)         # alice@example.com  (normalised)
print(u.email_domain)  # example.com        (derived)
```

---

## frozen=True: Immutable Dataclasses

`frozen=True` prevents attribute assignment after construction, making instances hashable.

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Point:
    x: float
    y: float

p = Point(3.0, 4.0)

# Immutable — raises FrozenInstanceError
try:
    p.x = 10.0
except Exception as e:
    print(type(e).__name__, e)
    # FrozenInstanceError cannot assign to field 'x'

# Hashable — can be used as dict key or set element
distances = {Point(0.0, 0.0): 0.0, Point(3.0, 4.0): 5.0}
print(distances[Point(3.0, 4.0)])   # 5.0

visited = {Point(1.0, 1.0), Point(2.0, 2.0)}
print(Point(1.0, 1.0) in visited)   # True

# Frozen + order: a value object with natural ordering
@dataclass(frozen=True, order=True)
class Version:
    major: int
    minor: int
    patch: int = 0

    def __str__(self):
        return f"{self.major}.{self.minor}.{self.patch}"

versions = [Version(2, 1), Version(1, 9), Version(2, 0, 5)]
versions.sort()
print([str(v) for v in versions])  # ['1.9.0', '2.0.5', '2.1.0']
```

---

## eq=True, order=True for Comparison Operators

By default `@dataclass` generates `__eq__` but not ordering (`<`, `>`, etc.). Set `order=True` to get all comparison operators. Fields are compared lexicographically in definition order.

```python
@dataclass(order=True)
class Student:
    # Fields are compared in order: gpa first, then name
    gpa: float
    name: str
    # sort_index is often used for custom ordering
    # But here we rely on field order

students = [
    Student(gpa=3.5, name="Bob"),
    Student(gpa=3.9, name="Alice"),
    Student(gpa=3.5, name="Alice"),
]
students.sort()
print(students)
# [Student(gpa=3.5, name='Alice'), Student(gpa=3.5, name='Bob'), Student(gpa=3.9, name='Alice')]

# Control ordering explicitly with a sort_index field
from dataclasses import dataclass, field

@dataclass(order=True)
class Task:
    sort_index: int = field(init=False, repr=False)
    priority: int
    name: str

    def __post_init__(self):
        # Lower priority number = should come first
        self.sort_index = self.priority

tasks = [Task(priority=3, name="cleanup"), Task(priority=1, name="hotfix")]
print(sorted(tasks))
# [Task(priority=1, name='hotfix'), Task(priority=3, name='cleanup')]
```

---

## Inheritance with Dataclasses

Dataclass inheritance works but has a rule: **fields with defaults must come after fields without defaults**, and that must hold across the full inheritance chain.

```python
from dataclasses import dataclass

@dataclass
class Base:
    id: int
    created_at: str = ""

@dataclass
class User(Base):
    username: str = ""
    email: str = ""

u = User(id=1, username="alice", email="alice@example.com")
print(u)
# User(id=1, created_at='', username='alice', email='alice@example.com')

# This fails — parent has default, child adds non-default field
# @dataclass
# class Parent:
#     x: int = 0
#
# @dataclass
# class Child(Parent):
#     y: int          # TypeError: non-default argument 'y' follows default argument
```

---

## dataclasses Utility Functions

```python
from dataclasses import dataclass, asdict, astuple, replace
from typing import Any

@dataclass
class Config:
    host: str
    port: int
    debug: bool = False
    tags: list[str] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []

cfg = Config(host="localhost", port=8080, tags=["web", "api"])

# asdict — deep conversion to a plain dict (great for JSON serialization)
d = asdict(cfg)
print(d)
# {'host': 'localhost', 'port': 8080, 'debug': False, 'tags': ['web', 'api']}

import json
print(json.dumps(d))   # '{"host": "localhost", "port": 8080, ...}'

# astuple — deep conversion to a tuple
t = astuple(cfg)
print(t)   # ('localhost', 8080, False, ['web', 'api'])

# replace — create a modified copy (like namedtuple._replace)
prod_cfg = replace(cfg, host="prod.example.com", debug=False)
print(prod_cfg)
# Config(host='prod.example.com', port=8080, debug=False, tags=['web', 'api'])
print(cfg)       # original unchanged

# fields() — inspect field metadata
from dataclasses import fields
for f in fields(cfg):
    print(f"{f.name}: {f.type} = {getattr(cfg, f.name)!r}")
```

---

## ClassVar vs InitVar

```python
from dataclasses import dataclass, field
from typing import ClassVar
from dataclasses import InitVar

@dataclass
class Counter:
    # ClassVar — class-level variable, NOT a field (not in __init__ or __repr__)
    _count: ClassVar[int] = 0

    name: str
    # InitVar — parameter to __init__ but NOT stored as a field
    multiplier: InitVar[int] = 1
    value: int = field(init=False)

    def __post_init__(self, multiplier: int):
        self.value = 0 * multiplier   # use the init-only param
        Counter._count += 1

    @classmethod
    def total_created(cls) -> int:
        return cls._count

c1 = Counter("first")
c2 = Counter("second", multiplier=10)
print(Counter.total_created())  # 2
print(c1)   # Counter(name='first', value=0)  — multiplier not stored
```

---

## Python 3.10+: slots=True and kw_only=True

```python
# slots=True — eliminates per-instance __dict__, saves memory
# Equivalent to manually defining __slots__ but generated automatically
@dataclass(slots=True)
class FastPoint:
    x: float
    y: float

import sys
from dataclasses import dataclass as regular_dc

@regular_dc
class RegularPoint:
    x: float
    y: float

fp = FastPoint(1.0, 2.0)
rp = RegularPoint(1.0, 2.0)
print(sys.getsizeof(fp))  # ~56 bytes  (no __dict__)
print(sys.getsizeof(rp))  # ~48 bytes  (but also has __dict__ at ~232 bytes)

# kw_only=True — all fields must be passed as keyword arguments
@dataclass(kw_only=True)
class APIRequest:
    url: str
    method: str = "GET"
    timeout: int = 30
    headers: dict = field(default_factory=dict)

req = APIRequest(url="https://api.example.com/users", method="POST", timeout=10)
# req = APIRequest("https://api.example.com/users")  # TypeError! url is kw_only
```

---

## Dataclass vs namedtuple

```python
from collections import namedtuple
from dataclasses import dataclass

# namedtuple — immutable, is-a-tuple (iterable, unpackable, hashable by default)
PointNT = namedtuple("PointNT", ["x", "y"])
p = PointNT(3, 4)
x, y = p        # unpackable
print(list(p))  # [3, 4]  — iterable
d = {p: "origin nearby"}  # hashable dict key

# dataclass — mutable by default, is-a-class (methods, inheritance, __post_init__)
@dataclass
class PointDC:
    x: float
    y: float

    def distance(self) -> float:
        return (self.x**2 + self.y**2) ** 0.5

p2 = PointDC(3.0, 4.0)
print(p2.distance())   # 5.0

# Summary:
# namedtuple → when you want tuple behaviour (unpack, iterate, positional args)
# dataclass  → when you want a real class (methods, validation, mutable, inheritance)
```

---

## Real-World Example: HTTP Request/Response Model

```python
from dataclasses import dataclass, field, asdict
from typing import Any
import json

@dataclass
class Headers:
    content_type: str = "application/json"
    authorization: str = field(default="", repr=False)  # hide tokens
    extra: dict[str, str] = field(default_factory=dict)

@dataclass
class HTTPRequest:
    method: str
    url: str
    headers: Headers = field(default_factory=Headers)
    body: Any = None
    timeout: float = 30.0

    def __post_init__(self):
        self.method = self.method.upper()
        if self.method not in {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"}:
            raise ValueError(f"Invalid HTTP method: {self.method}")

@dataclass
class HTTPResponse:
    status_code: int
    body: Any = None
    headers: Headers = field(default_factory=Headers)

    @property
    def ok(self) -> bool:
        return 200 <= self.status_code < 300

    def json(self) -> Any:
        if isinstance(self.body, str):
            return json.loads(self.body)
        return self.body

# Usage
req = HTTPRequest(
    method="post",
    url="https://api.example.com/users",
    headers=Headers(authorization="Bearer abc123"),
    body={"name": "Alice", "email": "alice@example.com"},
)
print(req.method)   # POST  (normalised)
print(req)
# HTTPRequest(method='POST', url='https://api.example.com/users',
#   headers=Headers(content_type='application/json', extra={}),
#   body={'name': 'Alice', ...}, timeout=30.0)

resp = HTTPResponse(status_code=201, body={"id": 42, "name": "Alice"})
print(resp.ok)      # True
print(resp.json())  # {'id': 42, 'name': 'Alice'}
```

---

## Key Takeaways

- `@dataclass` eliminates `__init__`, `__repr__`, and `__eq__` boilerplate. Use it for any class whose main purpose is holding data.
- Use `field(default_factory=list)` for mutable defaults — never `field(default=[])` or a bare `= []`.
- `__post_init__` is your hook for validation, normalisation, and derived fields.
- `frozen=True` makes instances immutable and hashable. Use it for value objects, dict keys, and thread-safe data.
- `order=True` generates `<`, `>`, `<=`, `>=` by comparing fields in definition order.
- `asdict()` and `replace()` are the two most useful utility functions — the former for serialisation, the latter for creating modified copies.
- Python 3.10+ `slots=True` is the easiest way to get the memory and speed benefits of `__slots__` without writing them manually.
- Prefer dataclasses over `namedtuple` unless you specifically need tuple behaviour (unpacking, iteration, positional comparison).
