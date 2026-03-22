---
title: "Static Type Checking with mypy"
description: "Add type annotations to Python code and catch bugs before runtime with mypy."
duration_minutes: 25
order: 4
---

## Why Type Annotations?

Python is dynamically typed — variables have no declared type. This flexibility is convenient but creates a class of bugs that only surface at runtime:

```python
def add(a, b):
    return a + b

add(1, 2)         # Fine: 3
add("hello", 1)   # Runtime TypeError: can only concatenate str to str
add([1], [2])     # Fine (list concat): [1, 2] — probably not intended
```

Type annotations let you declare the expected types and catch mismatches **before running the code**:

```python
def add(a: int, b: int) -> int:
    return a + b

# mypy will flag these at "compile time":
add("hello", 1)   # error: Argument 1 to "add" has incompatible type "str"; expected "int"
add([1], [2])     # error: Argument 1 has incompatible type "list[int]"; expected "int"
```

Additional benefits:
- **IDE completion and navigation**: editors can autocomplete methods and attributes correctly
- **Documentation**: type signatures explain what a function accepts and returns — no ambiguity
- **Refactoring safety**: rename a class; mypy catches all the missed updates

## Variable Annotations

```python
# Basic variable annotation (PEP 526)
x: int = 5
name: str = "Alice"
price: float = 9.99
is_active: bool = True

# Annotation without initial value (declares type, does not assign)
user_id: int  # Not assigned yet

# Class-level annotations
class Config:
    host: str
    port: int
    debug: bool = False  # With default value
```

## Function Annotations

```python
# Parameter and return type annotations
def greet(name: str, times: int = 1) -> str:
    return (f"Hello, {name}!\n" * times).strip()

# Multiple parameters
def create_user(
    username: str,
    email: str,
    age: int,
    is_admin: bool = False,
) -> dict:
    return {
        "username": username,
        "email": email,
        "age": age,
        "is_admin": is_admin,
    }

# Return type None (function has no meaningful return value)
def log_message(message: str, level: str = "INFO") -> None:
    print(f"[{level}] {message}")

# No return statement needed when return type is None
```

## Collection Types

### Old Style (Python 3.8 and below — requires `from typing import ...`)

```python
from typing import List, Dict, Tuple, Set, FrozenSet

def process_names(names: List[str]) -> List[str]:
    return [n.upper() for n in names]

def word_count(text: str) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for word in text.split():
        counts[word] = counts.get(word, 0) + 1
    return counts

def parse_point(data: Tuple[float, float]) -> Dict[str, float]:
    return {"x": data[0], "y": data[1]}

def unique_tags(items: List[Dict[str, str]]) -> Set[str]:
    return {item["tag"] for item in items}
```

### Modern Style (Python 3.9+ — built-in generics, no import needed)

```python
# Use lowercase built-in types directly
def process_names(names: list[str]) -> list[str]:
    return [n.upper() for n in names]

def word_count(text: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for word in text.split():
        counts[word] = counts.get(word, 0) + 1
    return counts

# Nested generics
def group_by_key(items: list[dict[str, str]], key: str) -> dict[str, list[dict[str, str]]]:
    result: dict[str, list[dict[str, str]]] = {}
    for item in items:
        k = item[key]
        result.setdefault(k, []).append(item)
    return result

# Tuple with fixed types
def parse_point(data: tuple[float, float]) -> dict[str, float]:
    return {"x": data[0], "y": data[1]}

# Variable-length tuple: tuple[int, ...]
def sum_all(values: tuple[int, ...]) -> int:
    return sum(values)
```

## Optional and Union

```python
from typing import Optional, Union  # Still useful for Python 3.9 compatibility

# Optional[X] means "X or None" — equivalent to Union[X, None]
def find_user(user_id: int) -> Optional[dict]:
    if user_id == 1:
        return {"id": 1, "name": "Alice"}
    return None

# Modern Python 3.10+ style — use | instead
def find_user_modern(user_id: int) -> dict | None:
    if user_id == 1:
        return {"id": 1, "name": "Alice"}
    return None

# Union: a value can be one of several types
def parse_id(raw_id: Union[str, int]) -> int:
    if isinstance(raw_id, str):
        return int(raw_id)
    return raw_id

# Python 3.10+ Union syntax
def parse_id_modern(raw_id: str | int) -> int:
    if isinstance(raw_id, str):
        return int(raw_id)
    return raw_id

# Narrowing: mypy understands isinstance checks
def process(value: int | str) -> str:
    if isinstance(value, int):
        # Here mypy knows value is int
        return str(value * 2)
    # Here mypy knows value is str
    return value.upper()
```

## Any: Opting Out

`Any` is the escape hatch — it disables type checking for a value. Use sparingly:

```python
from typing import Any

# Any is compatible with every type — mypy won't check it
def serialize(obj: Any) -> str:
    return str(obj)

# Useful for interoperating with untyped code
def process_legacy_data(data: Any) -> dict:
    # data comes from an untyped library, we don't know its structure
    return {"result": data.some_method()}

# Avoid: using Any as a crutch to silence type errors
# Instead, use proper types, Optional, Union, or TypedDict
```

## Type Aliases

```python
from typing import TypeAlias  # Python 3.10+

# Simple alias
UserId = int
Email = str
Coordinates = tuple[float, float]

def get_user(uid: UserId) -> dict:
    return {}

def send_email(to: Email, subject: str) -> None:
    pass

# Complex alias
JsonValue: TypeAlias = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

# Python 3.9 and below — just assignment
Vector = list[float]
Matrix = list[Vector]

def dot_product(a: Vector, b: Vector) -> float:
    return sum(x * y for x, y in zip(a, b))
```

## TypeVar and Generic Functions

When a function should work with any type but return the same type as its input:

```python
from typing import TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T:
    if not items:
        raise ValueError("Empty list")
    return items[0]

# mypy infers the type:
result_int: int = first([1, 2, 3])       # OK
result_str: str = first(["a", "b", "c"]) # OK
result_bad: int = first(["a", "b"])       # error: Incompatible types

# Bounded TypeVar: T must be a subtype of a given class
from typing import TypeVar
Numeric = TypeVar("Numeric", int, float)

def add_numbers(a: Numeric, b: Numeric) -> Numeric:
    return a + b
```

## typing.Protocol: Structural Subtyping (Duck Typing)

`Protocol` lets you define an interface by structure, not inheritance — any class with the right methods satisfies it:

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Drawable(Protocol):
    def draw(self) -> None: ...
    def get_bounds(self) -> tuple[float, float, float, float]: ...

class Circle:
    def __init__(self, x: float, y: float, radius: float):
        self.x = x
        self.y = y
        self.radius = radius

    def draw(self) -> None:
        print(f"Drawing circle at ({self.x}, {self.y})")

    def get_bounds(self) -> tuple[float, float, float, float]:
        return (self.x - self.radius, self.y - self.radius,
                self.x + self.radius, self.y + self.radius)

class Rectangle:
    def __init__(self, x: float, y: float, width: float, height: float):
        self.x, self.y, self.width, self.height = x, y, width, height

    def draw(self) -> None:
        print(f"Drawing rectangle at ({self.x}, {self.y})")

    def get_bounds(self) -> tuple[float, float, float, float]:
        return (self.x, self.y, self.x + self.width, self.y + self.height)

def render_all(shapes: list[Drawable]) -> None:
    for shape in shapes:
        shape.draw()

# Both Circle and Rectangle satisfy Drawable without inheriting from it
render_all([Circle(0, 0, 5), Rectangle(1, 1, 10, 20)])

# runtime_checkable enables isinstance checks
print(isinstance(Circle(0, 0, 5), Drawable))  # True
```

## Literal Types

`Literal` restricts a value to specific constants:

```python
from typing import Literal

HttpMethod = Literal["GET", "POST", "PUT", "DELETE", "PATCH"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

def make_request(url: str, method: HttpMethod = "GET") -> dict:
    # mypy will flag: make_request("/api", "INVALID")
    return {"url": url, "method": method}

def set_log_level(level: LogLevel) -> None:
    import logging
    logging.basicConfig(level=getattr(logging, level))

# Works: make_request("/api/users", "POST")
# Error: make_request("/api/users", "SEND")  # Not in Literal
```

## Final and ClassVar

```python
from typing import Final, ClassVar

# Final: variable cannot be reassigned after initial assignment
MAX_CONNECTIONS: Final[int] = 100
API_BASE_URL: Final = "https://api.example.com"

# MAX_CONNECTIONS = 200  # mypy error: Cannot assign to final name

class DatabaseConfig:
    # ClassVar: class-level attribute, not per-instance
    DEFAULT_POOL_SIZE: ClassVar[int] = 5
    MAX_RETRIES: ClassVar[Final[int]] = 3

    def __init__(self, url: str):
        self.url: str = url
        self.pool_size: int = DatabaseConfig.DEFAULT_POOL_SIZE
```

## Running mypy

```bash
# Install
pip install mypy

# Check a single file
mypy mymodule.py

# Check a package
mypy src/myapp/

# Strict mode — enables many additional checks
mypy --strict src/myapp/

# Ignore missing stubs for third-party packages
mypy --ignore-missing-imports src/
```

## Configuration in mypy.ini or pyproject.toml

```ini
# mypy.ini
[mypy]
python_version = 3.11
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True
disallow_any_generics = True
check_untyped_defs = True
strict_optional = True
ignore_missing_imports = True

# Per-module overrides
[mypy-legacy_module.*]
ignore_errors = True
```

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.11"
warn_return_any = true
disallow_untyped_defs = true
ignore_missing_imports = true
strict = true
```

## Common mypy Errors and Fixes

```python
# Error: Incompatible types in assignment
x: int = "hello"  # error: Incompatible types in assignment (expression has type "str", variable has type "int")
# Fix: use correct type

# Error: Item "None" of "Optional[X]" has no attribute "..."
def get_user(uid: int) -> dict | None:
    return {"name": "Alice"} if uid == 1 else None

user = get_user(1)
print(user["name"])  # error: Item "None" of "dict[str, str] | None" has no attribute "__getitem__"
# Fix: guard with None check
if user is not None:
    print(user["name"])  # OK

# Error: Missing return statement
def divide(a: int, b: int) -> float:
    if b != 0:
        return a / b
    # Missing return! mypy catches this.
# Fix: return 0.0 or raise an exception in the else branch

# Error: Argument has incompatible type
def process(items: list[int]) -> int:
    return sum(items)

process(["a", "b"])  # error: List item 0 has incompatible type "str"; expected "int"
```

## Gradual Typing

You don't have to annotate everything at once. Add types incrementally:

```python
# Step 1: annotate the most important functions first
# Step 2: use # type: ignore to suppress errors you can't fix yet
result = legacy_function(data)  # type: ignore[no-untyped-call]

# Step 3: use Any for external untyped data
from typing import Any
raw_data: Any = external_library.fetch()

# Step 4: add stubs for third-party libraries
pip install types-requests  # Type stubs for 'requests'
pip install types-PyYAML    # Type stubs for 'pyyaml'
```

The `--ignore-missing-imports` flag is useful early on — it silences errors for third-party packages without type stubs.

## Key Takeaways

- Type annotations are entirely optional at runtime but enable static analysis tools like mypy to catch type errors before execution.
- Use `list[str]`, `dict[str, int]`, `tuple[int, str]` (Python 3.9+) or `from typing import List, Dict, Tuple` for older versions.
- `Optional[X]` (equivalent to `X | None` in Python 3.10+) signals a value that may be absent — always guard against `None` before using it.
- `Union[X, Y]` (or `X | Y` in Python 3.10+) allows a value to be one of multiple types.
- `Any` opts out of type checking — use sparingly and only at the edges where untyped code enters your system.
- `Protocol` enables structural subtyping — any class implementing the required methods satisfies the protocol, without inheritance.
- `Literal["GET", "POST"]` restricts a string to specific values; `Final` prevents reassignment; `ClassVar` marks class-level attributes.
- Run `mypy src/` to check your code; configure strictness in `mypy.ini` or `pyproject.toml`.
- Adopt types **gradually** — start with the most critical functions, use `# type: ignore` as a temporary escape hatch, and increase strictness over time.
