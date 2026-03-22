---
title: "Abstract Base Classes"
description: "Design robust interfaces and type hierarchies using Python's ABC module."
duration_minutes: 25
order: 6
---

## Abstract Base Classes

Python's duck typing is flexible: if it walks like a duck and quacks like a duck, it is a duck. But in larger codebases, you often need to **enforce** that a class implements a specific interface. Abstract Base Classes (ABCs) provide exactly that — compile-time enforcement of required methods.

---

## The Problem: Duck Typing Without Enforcement

```python
class FileStorage:
    def save(self, key: str, data: bytes) -> None:
        with open(key, "wb") as f:
            f.write(data)

    def load(self, key: str) -> bytes:
        with open(key, "rb") as f:
            return f.read()

    def delete(self, key: str) -> None:
        import os
        os.remove(key)


class S3Storage:
    def save(self, key: str, data: bytes) -> None:
        pass  # pretend this calls boto3

    def load(self, key: str) -> bytes:
        return b""  # pretend

    # OOPS — forgot to implement delete()!


def backup(storage, key: str, data: bytes) -> None:
    storage.save(key, data)
    storage.delete(key)   # AttributeError at runtime — too late!

storage = S3Storage()
backup(storage, "backup.bin", b"data")   # crashes at runtime
```

With ABCs, the missing method is caught **at instantiation time**, not when the method is first called.

---

## abc.ABC and @abstractmethod

```python
from abc import ABC, abstractmethod

class Storage(ABC):
    """Abstract interface for a key-value storage backend."""

    @abstractmethod
    def save(self, key: str, data: bytes) -> None:
        """Persist data under key."""
        ...

    @abstractmethod
    def load(self, key: str) -> bytes:
        """Retrieve data for key. Raises KeyError if not found."""
        ...

    @abstractmethod
    def delete(self, key: str) -> None:
        """Remove key. Raises KeyError if not found."""
        ...

    # Concrete method — shared implementation available to all subclasses
    def exists(self, key: str) -> bool:
        try:
            self.load(key)
            return True
        except KeyError:
            return False


# Attempting to instantiate the ABC directly raises TypeError
try:
    s = Storage()
except TypeError as e:
    print(e)
    # Can't instantiate abstract class Storage with abstract methods delete, load, save


# A class that implements all methods can be instantiated
class MemoryStorage(Storage):
    def __init__(self):
        self._store: dict[str, bytes] = {}

    def save(self, key: str, data: bytes) -> None:
        self._store[key] = data

    def load(self, key: str) -> bytes:
        try:
            return self._store[key]
        except KeyError:
            raise KeyError(f"Key not found: {key!r}")

    def delete(self, key: str) -> None:
        try:
            del self._store[key]
        except KeyError:
            raise KeyError(f"Key not found: {key!r}")


mem = MemoryStorage()
mem.save("config", b'{"debug": true}')
print(mem.load("config"))   # b'{"debug": true}'
print(mem.exists("config")) # True  (uses the concrete method from Storage)
print(mem.exists("other"))  # False
mem.delete("config")


# A class missing even one abstract method cannot be instantiated
class IncompleteStorage(Storage):
    def save(self, key, data):
        pass

    def load(self, key):
        return b""

    # delete() not implemented!

try:
    bad = IncompleteStorage()
except TypeError as e:
    print(e)
    # Can't instantiate abstract class IncompleteStorage with abstract method delete
```

---

## @abstractmethod with @property: Abstract Properties

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @property
    @abstractmethod
    def area(self) -> float:
        """Return the area of the shape."""
        ...

    @property
    @abstractmethod
    def perimeter(self) -> float:
        """Return the perimeter of the shape."""
        ...

    # Concrete method using the abstract properties
    def describe(self) -> str:
        return (
            f"{type(self).__name__}: "
            f"area={self.area:.2f}, "
            f"perimeter={self.perimeter:.2f}"
        )


class Circle(Shape):
    import math

    def __init__(self, radius: float):
        self.radius = radius

    @property
    def area(self) -> float:
        import math
        return math.pi * self.radius ** 2

    @property
    def perimeter(self) -> float:
        import math
        return 2 * math.pi * self.radius


class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    @property
    def area(self) -> float:
        return self.width * self.height

    @property
    def perimeter(self) -> float:
        return 2 * (self.width + self.height)


shapes = [Circle(5), Rectangle(4, 6)]
for shape in shapes:
    print(shape.describe())
# Circle: area=78.54, perimeter=31.42
# Rectangle: area=24.00, perimeter=20.00

# isinstance works correctly
print(isinstance(Circle(1), Shape))      # True
print(isinstance(Rectangle(1, 1), Shape)) # True
```

---

## ABCs in collections.abc

The `collections.abc` module provides a rich set of ABCs for container types. They also register built-in types automatically.

```python
from collections.abc import (
    Sized, Iterable, Iterator,
    Sequence, MutableSequence,
    Mapping, MutableMapping,
    Callable, Hashable,
)

# isinstance checks using ABCs — works without explicit inheritance
print(isinstance([1, 2, 3], Sequence))         # True
print(isinstance([1, 2, 3], MutableSequence))  # True
print(isinstance((1, 2, 3), Sequence))         # True
print(isinstance((1, 2, 3), MutableSequence))  # False — tuples are immutable
print(isinstance({"a": 1}, Mapping))           # True
print(isinstance({"a": 1}, MutableMapping))    # True
print(isinstance(len, Callable))               # True
print(isinstance(42, Hashable))                # True
print(isinstance([], Hashable))                # False — lists are not hashable

# Use ABCs in type hints for maximum flexibility
from collections.abc import Sequence as SeqABC, Mapping as MapABC

def process_items(items: SeqABC[int]) -> int:
    """Accepts any sequence: list, tuple, range, custom sequence."""
    return sum(items)

print(process_items([1, 2, 3]))        # 6
print(process_items((1, 2, 3)))        # 6
print(process_items(range(1, 4)))      # 6

def get_config(cfg: MapABC[str, object]) -> str:
    """Accepts any mapping: dict, OrderedDict, custom mapping."""
    return cfg.get("host", "localhost")

print(get_config({"host": "prod.example.com"}))  # prod.example.com
```

---

## Virtual Subclasses: ABC.register()

You can declare that a class "implements" an ABC without having it inherit from it. This is called **virtual subclass registration**.

```python
from abc import ABC, abstractmethod

class Drawable(ABC):
    @abstractmethod
    def draw(self) -> str:
        ...

# Third-party class we can't modify
class ThirdPartyWidget:
    def draw(self) -> str:
        return "Widget drawn by third-party library"

# Register it as a virtual subclass
Drawable.register(ThirdPartyWidget)

w = ThirdPartyWidget()
print(isinstance(w, Drawable))    # True — registered!
print(issubclass(ThirdPartyWidget, Drawable))  # True

# CAVEAT: registration does NOT check method signatures
class BadWidget:
    pass   # no draw() method

Drawable.register(BadWidget)
print(isinstance(BadWidget(), Drawable))  # True — but calling .draw() would fail!
# Virtual registration skips the abstract method check
```

---

## __subclasshook__: Structural Checking

`__subclasshook__` lets you define what it means for a class to be a "virtual subclass" based on its structure (duck typing), rather than explicit registration.

```python
from abc import ABC, abstractmethod

class Closeable(ABC):
    @abstractmethod
    def close(self) -> None:
        ...

    @classmethod
    def __subclasshook__(cls, C):
        if cls is Closeable:
            # Check if C (or any base of C) has a 'close' method
            if any("close" in B.__dict__ for B in C.__mro__):
                return True   # Yes, treat it as a Closeable
        return NotImplemented   # Fall back to normal ABC rules

# Files have .close() — automatically recognized without register()
import io
print(isinstance(open("/dev/null"), Closeable))   # True

# Custom class with close()
class DatabaseConnection:
    def close(self) -> None:
        print("DB connection closed")

print(isinstance(DatabaseConnection(), Closeable))  # True

# Class without close()
class NoClose:
    pass

print(isinstance(NoClose(), Closeable))   # False
```

---

## ABCs vs typing.Protocol

Python 3.8 introduced `typing.Protocol` as a purely structural alternative to ABCs.

```python
from abc import ABC, abstractmethod
from typing import Protocol, runtime_checkable

# ABC approach — NOMINAL typing (explicit inheritance required)
class Serializable(ABC):
    @abstractmethod
    def serialize(self) -> bytes:
        ...

class Document(Serializable):
    def __init__(self, content: str):
        self.content = content

    def serialize(self) -> bytes:
        return self.content.encode("utf-8")

# Must inherit from Serializable — you can't forget, but third-party classes
# need explicit registration.


# Protocol approach — STRUCTURAL typing (duck typing with static checks)
@runtime_checkable
class Serializable2(Protocol):
    def serialize(self) -> bytes:
        ...

class Image:
    # No inheritance needed!
    def serialize(self) -> bytes:
        return b"\x89PNG..."

img = Image()
print(isinstance(img, Serializable2))   # True — has serialize()

class NoSerialize:
    pass

print(isinstance(NoSerialize(), Serializable2))  # False

# Protocol is checked structurally by type checkers (mypy, pyright)
# even without @runtime_checkable at static analysis time.
```

**Choosing between ABC and Protocol:**

| Situation | Prefer |
|-----------|--------|
| Public library defining an interface | `ABC` or `Protocol` |
| Need `isinstance`/`issubclass` checks | `ABC` with concrete methods, or `@runtime_checkable Protocol` |
| Structural duck typing + static analysis | `Protocol` |
| Shared implementation in the base class | `ABC` (concrete methods) |
| Third-party types you can't modify | `Protocol` (no registration needed) |
| Large internal codebase | Either; Protocol is more flexible |

---

## Real-World Example: A Multi-Backend Storage System

```python
from abc import ABC, abstractmethod
from pathlib import Path
import json

class StorageBackend(ABC):
    """Abstract interface for persistent key-value storage."""

    @abstractmethod
    def save(self, key: str, data: bytes) -> None: ...

    @abstractmethod
    def load(self, key: str) -> bytes: ...

    @abstractmethod
    def delete(self, key: str) -> None: ...

    @abstractmethod
    def list_keys(self) -> list[str]: ...

    # Concrete utility methods available to all backends
    def save_json(self, key: str, obj: object) -> None:
        self.save(key, json.dumps(obj).encode("utf-8"))

    def load_json(self, key: str) -> object:
        return json.loads(self.load(key).decode("utf-8"))

    def copy(self, src_key: str, dst_key: str) -> None:
        self.save(dst_key, self.load(src_key))


class FileSystemBackend(StorageBackend):
    def __init__(self, base_dir: str):
        self.base = Path(base_dir)
        self.base.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        return self.base / key.replace("/", "_")

    def save(self, key: str, data: bytes) -> None:
        self._path(key).write_bytes(data)

    def load(self, key: str) -> bytes:
        p = self._path(key)
        if not p.exists():
            raise KeyError(key)
        return p.read_bytes()

    def delete(self, key: str) -> None:
        p = self._path(key)
        if not p.exists():
            raise KeyError(key)
        p.unlink()

    def list_keys(self) -> list[str]:
        return [f.name for f in self.base.iterdir() if f.is_file()]


class MemoryBackend(StorageBackend):
    def __init__(self):
        self._store: dict[str, bytes] = {}

    def save(self, key: str, data: bytes) -> None:
        self._store[key] = data

    def load(self, key: str) -> bytes:
        if key not in self._store:
            raise KeyError(key)
        return self._store[key]

    def delete(self, key: str) -> None:
        if key not in self._store:
            raise KeyError(key)
        del self._store[key]

    def list_keys(self) -> list[str]:
        return list(self._store.keys())


# Application code works with any backend
def run_app(storage: StorageBackend) -> None:
    storage.save_json("config", {"debug": True, "version": "1.0"})
    storage.save("logo.png", b"\x89PNG...")

    cfg = storage.load_json("config")
    print(f"Debug mode: {cfg['debug']}")
    print(f"Keys: {storage.list_keys()}")

# Swap backends without changing application logic
print("=== Memory backend ===")
run_app(MemoryBackend())

print("=== Filesystem backend ===")
run_app(FileSystemBackend("/tmp/myapp_storage"))
```

---

## Key Takeaways

- `ABC` + `@abstractmethod` enforce interfaces at **instantiation time**, not when the method is first called. This catches bugs earlier.
- A class with unimplemented abstract methods **cannot be instantiated** — Python raises `TypeError`.
- Use `@property` + `@abstractmethod` together to define required properties in subclasses.
- `collections.abc` provides ABCs for standard container types (`Sequence`, `Mapping`, `Callable`, etc.). Use them in type hints to write flexible APIs.
- `ABC.register()` declares virtual subclasses without inheritance — useful for third-party types. But it skips method checking!
- `__subclasshook__` provides class-level structural checking: automatically recognize any class that has the right methods.
- `typing.Protocol` is the modern structural alternative. It enables duck typing with static type-checker support, no inheritance required.
- For **public APIs**, prefer ABCs when you need shared implementation in the base class, or Protocol when you only need to specify a structural interface.
- ABC concrete methods provide shared functionality that all backends get for free — a key advantage over pure Protocol.
