---
title: "Context Managers"
description: "Manage resources safely with the 'with' statement and custom context managers."
duration_minutes: 20
order: 3
---

## The Problem: Resource Management

Resources like files, network connections, and locks need to be properly cleaned up:

```python
# Without context manager (risky)
f = open("file.txt")
try:
    content = f.read()
finally:
    f.close()  # Must remember to close!

# With context manager (safe)
with open("file.txt") as f:
    content = f.read()
# File automatically closed
```

## How Context Managers Work

A context manager implements `__enter__` and `__exit__`:

```python
class ManagedFile:
    def __init__(self, filename, mode="r"):
        self.filename = filename
        self.mode = mode
        self.file = None

    def __enter__(self):
        self.file = open(self.filename, self.mode)
        return self.file

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.file:
            self.file.close()
        # Return True to suppress exception, False to propagate
        return False

with ManagedFile("test.txt", "w") as f:
    f.write("Hello, World!")
```

## The contextlib Module

### @contextmanager Decorator

Create context managers from generator functions:

```python
from contextlib import contextmanager

@contextmanager
def managed_file(filename, mode="r"):
    f = open(filename, mode)
    try:
        yield f  # Value returned to 'as' variable
    finally:
        f.close()

with managed_file("test.txt") as f:
    content = f.read()
```

### Timing Context Manager

```python
import time
from contextlib import contextmanager

@contextmanager
def timer(label):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        print(f"{label}: {elapsed:.4f}s")

with timer("Data processing"):
    # Long operation
    time.sleep(1)
# Output: Data processing: 1.0012s
```

## Common Use Cases

### Database Transactions

```python
@contextmanager
def transaction(connection):
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise

with transaction(db_conn) as conn:
    conn.execute("INSERT INTO users VALUES (?)", ("Alice",))
    conn.execute("INSERT INTO users VALUES (?)", ("Bob",))
# Committed if no exception, rolled back otherwise
```

### Temporary Directory Changes

```python
import os
from contextlib import contextmanager

@contextmanager
def change_dir(path):
    old_dir = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(old_dir)

with change_dir("/tmp"):
    print(os.getcwd())  # /tmp
print(os.getcwd())  # Back to original
```

### Suppressing Exceptions

```python
from contextlib import suppress

# Instead of try/except pass
with suppress(FileNotFoundError):
    os.remove("temp.txt")
# No error if file doesn't exist
```

### Redirecting Output

```python
from contextlib import redirect_stdout
import io

f = io.StringIO()
with redirect_stdout(f):
    print("Hello!")

output = f.getvalue()  # "Hello!\n"
```

## Nested Context Managers

```python
# Multiple managers in one with statement
with open("input.txt") as infile, open("output.txt", "w") as outfile:
    outfile.write(infile.read().upper())

# Using ExitStack for dynamic number of managers
from contextlib import ExitStack

files = ["a.txt", "b.txt", "c.txt"]
with ExitStack() as stack:
    handles = [stack.enter_context(open(f)) for f in files]
    # All files open, will all be closed
```

## Async Context Managers

For async resources:

```python
import asyncio
from contextlib import asynccontextmanager

@asynccontextmanager
async def async_timer(label):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        print(f"{label}: {elapsed:.4f}s")

async def main():
    async with async_timer("Async operation"):
        await asyncio.sleep(1)
```

## Exception Handling in Context Managers

```python
class ManagedResource:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # exc_type: Exception class (or None)
        # exc_val: Exception instance (or None)
        # exc_tb: Traceback (or None)

        if exc_type is ValueError:
            print(f"Caught ValueError: {exc_val}")
            return True  # Suppress the exception

        return False  # Propagate other exceptions

with ManagedResource():
    raise ValueError("Test")  # Suppressed
# Continues normally

with ManagedResource():
    raise TypeError("Test")  # Propagated
# Raises TypeError
```

## Key Takeaways

1. Context managers ensure proper resource cleanup
2. Implement `__enter__` and `__exit__` for class-based managers
3. Use `@contextmanager` decorator for simpler generator-based managers
4. `__exit__` receives exception info; return `True` to suppress
5. `ExitStack` manages a dynamic number of context managers
6. Use `@asynccontextmanager` for async resources
