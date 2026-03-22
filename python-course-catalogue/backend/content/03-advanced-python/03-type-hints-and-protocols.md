---
title: "Type Hints and Protocols"
description: "Write safer code with type annotations and structural subtyping."
duration_minutes: 30
order: 3
---

## Why Type Hints?

Type hints provide:
- Documentation that stays in sync with code
- IDE autocompletion and error detection
- Static analysis with tools like mypy
- Better refactoring support

```python
# Without type hints
def greet(name):
    return f"Hello, {name}!"

# With type hints
def greet(name: str) -> str:
    return f"Hello, {name}!"
```

## Basic Type Annotations

### Primitives and Builtins

```python
# Basic types
name: str = "Alice"
age: int = 30
price: float = 19.99
is_active: bool = True

# Collections (Python 3.9+)
numbers: list[int] = [1, 2, 3]
mapping: dict[str, int] = {"a": 1, "b": 2}
unique: set[str] = {"x", "y"}
coordinates: tuple[float, float] = (10.0, 20.0)

# Pre-3.9 style (still works)
from typing import List, Dict, Set, Tuple
numbers: List[int] = [1, 2, 3]
```

### Optional and Union

```python
from typing import Optional, Union

# Optional = Union with None
def find_user(user_id: int) -> Optional[dict]:
    """Returns user dict or None if not found."""
    pass

# Union for multiple types
def process(value: Union[int, str]) -> str:
    return str(value)

# Python 3.10+ pipe syntax
def process(value: int | str) -> str:
    return str(value)

def find_user(user_id: int) -> dict | None:
    pass
```

### Any and Type Variables

```python
from typing import Any, TypeVar

# Any disables type checking
def process(data: Any) -> Any:
    return data

# TypeVar for generic functions
T = TypeVar("T")

def first(items: list[T]) -> T:
    return items[0]

# Bounded TypeVar
Number = TypeVar("Number", int, float)

def double(x: Number) -> Number:
    return x * 2
```

## Function Signatures

```python
from typing import Callable

# Function that takes a callback
def apply_func(
    func: Callable[[int, int], int],
    a: int,
    b: int
) -> int:
    return func(a, b)

# *args and **kwargs
def variadic(*args: int, **kwargs: str) -> None:
    pass
```

## Classes and Self

```python
from typing import Self  # Python 3.11+

class Builder:
    def set_name(self, name: str) -> Self:
        self.name = name
        return self

    def set_age(self, age: int) -> Self:
        self.age = age
        return self

# Pre-3.11: use TypeVar or string annotation
from typing import TypeVar
T = TypeVar("T", bound="Builder")

class Builder:
    def set_name(self: T, name: str) -> T:
        self.name = name
        return self
```

## Protocols: Structural Subtyping

Protocols define interfaces without inheritance (duck typing with type hints):

```python
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None: ...

class Circle:
    def draw(self) -> None:
        print("Drawing circle")

class Square:
    def draw(self) -> None:
        print("Drawing square")

def render(shape: Drawable) -> None:
    shape.draw()

# Works! Circle and Square are "Drawable" by structure
render(Circle())
render(Square())
```

### Protocol with Attributes

```python
from typing import Protocol

class Named(Protocol):
    name: str

class Person:
    def __init__(self, name: str):
        self.name = name

class Company:
    name: str = "Acme Inc"

def greet(entity: Named) -> str:
    return f"Hello, {entity.name}!"

greet(Person("Alice"))  # OK
greet(Company())        # OK
```

### Runtime Checkable Protocols

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None: ...

class File:
    def close(self) -> None:
        pass

f = File()
print(isinstance(f, Closeable))  # True
```

## Generic Classes

```python
from typing import Generic, TypeVar

T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

# Usage
stack: Stack[int] = Stack()
stack.push(1)
stack.push(2)
value: int = stack.pop()
```

## Type Aliases

```python
from typing import TypeAlias

# Simple alias
UserId: TypeAlias = int
JSON: TypeAlias = dict[str, Any]

# Complex types
Handler: TypeAlias = Callable[[Request], Response]
Cache: TypeAlias = dict[str, tuple[float, Any]]

def get_user(user_id: UserId) -> JSON:
    pass
```

## Literal Types

```python
from typing import Literal

def set_mode(mode: Literal["read", "write", "append"]) -> None:
    pass

set_mode("read")   # OK
set_mode("delete") # Type error

# Union with Literal
Status = Literal["pending", "active", "completed"]
```

## TypedDict

Define dictionary shapes:

```python
from typing import TypedDict

class User(TypedDict):
    id: int
    name: str
    email: str

class PartialUser(TypedDict, total=False):
    id: int
    name: str
    email: str  # All fields optional

def create_user(data: User) -> None:
    print(data["name"])

create_user({"id": 1, "name": "Alice", "email": "a@b.com"})
```

## Running Type Checkers

```bash
# Install mypy
pip install mypy

# Check a file
mypy script.py

# Check with strict mode
mypy --strict script.py

# Configuration in mypy.ini or pyproject.toml
```

## Key Takeaways

1. Type hints improve readability and catch errors early
2. Use `Optional[T]` or `T | None` for nullable values
3. Protocols enable structural subtyping (duck typing with types)
4. `Generic[T]` creates reusable parameterized classes
5. TypedDict defines dictionary schemas
6. Run mypy for static type checking
