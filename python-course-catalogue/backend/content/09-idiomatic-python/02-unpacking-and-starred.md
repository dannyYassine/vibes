---
title: "Unpacking, Starred Expressions & Walrus"
description: "Master Python's powerful unpacking syntax and the walrus operator."
duration_minutes: 25
order: 2
---

## Overview

Python's unpacking syntax lets you destructure sequences and mappings concisely. Combined with starred expressions, it handles variable-length sequences. The walrus operator (`:=`) adds assignment-within-expression, enabling patterns that were previously verbose or required double computation. Together, these tools produce code that is both shorter and clearer.

---

## Basic Tuple Unpacking

The simplest form assigns names to the elements of a sequence:

```python
# Without unpacking — verbose and fragile
point = (3, 7)
x = point[0]
y = point[1]

# With unpacking — clean and self-documenting
x, y = point
print(x, y)   # 3 7

# Works with any iterable, not just tuples
a, b, c = [10, 20, 30]
a, b, c = "XYZ"
a, b    = {1, 2}    # sets are unordered — only safe if size is known and order doesn't matter
```

The number of names on the left must match the number of elements on the right — otherwise Python raises `ValueError: too many/not enough values to unpack`.

---

## Swap Without a Temp Variable

One of the most elegant Python idioms:

```python
a, b = 5, 10

# C-style swap
temp = a
a = b
b = temp

# Pythonic swap — right side is evaluated fully before assignment
a, b = b, a
print(a, b)   # 10 5

# Works for any number of variables
x, y, z = z, y, x    # reverse three values at once
```

This works because the right-hand side is evaluated as a tuple before any assignment occurs.

---

## Extended Iterable Unpacking (Starred Expressions)

Python 3 introduced the `*` syntax to capture a variable-length middle (or prefix/suffix):

```python
first, *rest = [1, 2, 3, 4, 5]
print(first)   # 1
print(rest)    # [2, 3, 4, 5]   — always a list, even if empty

*init, last = [1, 2, 3, 4, 5]
print(init)    # [1, 2, 3, 4]
print(last)    # 5

first, *middle, last = [1, 2, 3, 4, 5]
print(first)    # 1
print(middle)   # [2, 3, 4]
print(last)     # 5

# With only two elements
first, *middle, last = [1, 2]
print(first)    # 1
print(middle)   # []    — empty list, not an error
print(last)     # 2

# Single element — starred captures zero items
first, *rest = [42]
print(first)   # 42
print(rest)    # []
```

### Practical Example: Processing CSV Headers

```python
def process_csv_line(line: str):
    fields = line.strip().split(",")
    id_field, *data_fields, timestamp = fields
    return {
        "id": id_field,
        "data": data_fields,
        "timestamp": timestamp,
    }

row = process_csv_line("001,Alice,Engineer,NYC,2024-06-15")
print(row)
# {'id': '001', 'data': ['Alice', 'Engineer', 'NYC'], 'timestamp': '2024-06-15'}
```

---

## Underscore for Throwaway Values

Use `_` by convention to signal that a value is intentionally ignored:

```python
# Ignore the middle value
_, important, _ = (1, 42, 3)
print(important)   # 42

# Ignore in extended unpacking
first, *_, last = range(100)
print(first, last)   # 0 99

# Ignore loop counter
for _ in range(5):
    print("hello")

# Ignore multiple return values
_, status_code, _ = get_response()   # only care about status_code
```

Note: `_` is a real variable — it gets assigned. In the REPL, `_` holds the last evaluated result. In test frameworks, `_` may have special meaning (e.g., pytest). Use `__` (double underscore) when you need more than one throwaway in the same expression.

---

## Unpacking in for Loops

Unpacking shines when iterating over sequences of tuples or structured data:

```python
points = [(1, 2), (3, 4), (5, 6)]

# Without unpacking — index-based access is error-prone
for point in points:
    print(point[0], point[1])

# With unpacking — self-documenting
for x, y in points:
    print(f"({x}, {y})")

# With enumerate
data = ["apple", "banana", "cherry"]
for index, value in enumerate(data, start=1):
    print(f"{index}. {value}")

# With zip
names  = ["Alice", "Bob", "Carol"]
scores = [95, 82, 78]
for name, score in zip(names, scores):
    print(f"{name}: {score}")

# Nested sequences
matrix_row = [(1, 2, 3), (4, 5, 6), (7, 8, 9)]
for a, b, c in matrix_row:
    print(a + b + c)
```

---

## Nested Unpacking

Python supports unpacking nested structures:

```python
# Unpack a nested tuple
(a, b), c = (1, 2), 3
print(a, b, c)   # 1 2 3

# Unpack a list of pairs
pairs = [(1, "one"), (2, "two"), (3, "three")]
for number, (digit, name) in enumerate(pairs):
    print(f"{number}: {digit} = {name}")
# Wait — that's wrong. Let's do it correctly:

for digit, name in pairs:
    print(f"{digit} = {name}")

# Mixed depth
data = ((1, 2), (3, (4, 5)))
(a, b), (c, (d, e)) = data
print(a, b, c, d, e)   # 1 2 3 4 5
```

---

## Unpacking in Function Calls

The `*` and `**` operators unpack sequences and dicts into function arguments:

```python
def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}!"

args   = ("Alice",)
kwargs = {"greeting": "Hi"}

print(greet(*args))             # "Hello, Alice!"
print(greet(*args, **kwargs))   # "Hi, Alice!"

# Composing function calls
def make_range(start, stop, step=1):
    return list(range(start, stop, step))

params = [0, 20]
opts   = {"step": 2}
print(make_range(*params, **opts))   # [0, 2, 4, ..., 18]

# Passing multiple lists to a function that takes varargs
def total(*numbers):
    return sum(numbers)

list1 = [1, 2, 3]
list2 = [4, 5, 6]
print(total(*list1, *list2))   # 21  — Python 3.5+: multiple unpacking in one call
```

---

## dict Unpacking for Merging

```python
defaults = {"color": "blue", "size": "medium", "weight": 10}
overrides = {"color": "red", "weight": 20}

# Merge: overrides take precedence (later keys win)
merged = {**defaults, **overrides}
print(merged)   # {'color': 'red', 'size': 'medium', 'weight': 20}

# Add fields while copying
user = {"name": "Alice", "age": 30}
updated_user = {**user, "age": 31, "city": "NYC"}
print(updated_user)   # {'name': 'Alice', 'age': 31, 'city': 'NYC'}

# Python 3.9+ — the | operator for dict merging
merged = defaults | overrides        # new dict
defaults |= overrides                # in-place

# Merge multiple dicts (Python 3.5+)
a = {"x": 1}
b = {"y": 2}
c = {"z": 3}
combined = {**a, **b, **c}
print(combined)   # {'x': 1, 'y': 2, 'z': 3}
```

---

## The Walrus Operator :=

Introduced in Python 3.8 (PEP 572), the walrus operator assigns a value to a name as part of an expression. It is called "walrus" because `:=` looks like a walrus's eyes and tusks.

```python
# Classic pattern — compute, then test
value = compute_something()
if value > 0:
    use(value)

# Walrus — compute and test in one line
if (value := compute_something()) > 0:
    use(value)
```

### while Loop: Reading in Chunks

The most idiomatic walrus use case:

```python
# Without walrus — slightly awkward
with open("large_file.bin", "rb") as f:
    chunk = f.read(8192)
    while chunk:
        process(chunk)
        chunk = f.read(8192)   # repeated read call

# With walrus — clean and concise
with open("large_file.bin", "rb") as f:
    while chunk := f.read(8192):
        process(chunk)
# Loop ends when read() returns b"" (falsy)
```

### Comprehension Filtering with Expensive Computation

```python
import re

data = ["foo 42", "bar", "baz 17", "qux", "quux 99"]

# Without walrus — double computation
results = [
    int(re.search(r"\d+", s).group())
    for s in data
    if re.search(r"\d+", s)   # search is called twice for matching items!
]

# With walrus — search is called once per item
results = [
    m.group()
    for s in data
    if (m := re.search(r"\d+", s))
]
print(results)   # ['42', '17', '99']
```

### Checking and Using a Regex Match

```python
import re

log_line = "2024-06-15 ERROR disk usage at 92%"

# Without walrus
m = re.search(r"(\w+) disk usage at (\d+)%", log_line)
if m:
    print(f"Level: {m.group(1)}, Usage: {m.group(2)}%")

# With walrus — cleaner for one-off checks
if m := re.search(r"(\w+) disk usage at (\d+)%", log_line):
    print(f"Level: {m.group(1)}, Usage: {m.group(2)}%")
```

### Reading Until Sentinel

```python
import socket

def handle_connection(sock: socket.socket) -> bytes:
    """Receive data until the connection closes."""
    buffer = b""
    while data := sock.recv(4096):
        buffer += data
    return buffer
```

### In a while Loop with Complex Condition

```python
import subprocess

# Run a command repeatedly until it succeeds or returns a specific code
max_retries = 5
attempt = 0

while (attempt := attempt + 1) <= max_retries:
    result = subprocess.run(["mycommand"], capture_output=True)
    if result.returncode == 0:
        print(f"Succeeded on attempt {attempt}")
        break
else:
    print(f"Failed after {max_retries} attempts")
```

---

## Walrus Gotchas

### Only in the Condition, Not the Expression Part of a Comprehension

```python
# VALID — walrus in the filter condition
results = [processed for x in data if (processed := transform(x)) > 0]

# INVALID — walrus in the expression part confuses scope
# results = [(y := f(x)) for x in data]  # y leaks into enclosing scope
# Be careful: walrus in comprehension expressions leaks into the enclosing scope
# This is intentional (PEP 572) but surprising

y = None
squares = [(y := x**2) for x in range(5)]
print(y)   # 16  — y is visible here! This is often unintended
```

### Parentheses Are Required

The walrus operator has very low precedence. Wrap it in parentheses when used in conditions:

```python
# This is a syntax error:
# if x := f() > 0:

# Correct:
if (x := f()) > 0:
    use(x)
```

### Readability First

Walrus is not always an improvement. If the regular version is clearer, use it:

```python
# Walrus for the sake of it — worse
if (n := len(data)) > 100 and n < 1000:
    process_medium_data(data)

# Just compute n once the normal way
n = len(data)
if 100 < n < 1000:
    process_medium_data(data)
```

Use walrus when it genuinely eliminates duplication (like the chunk-reading loop) or avoids recomputing an expression in both the condition and the body.

---

## Key Takeaways

- **Unpacking** replaces index-based element access with named bindings, making code self-documenting.
- **`a, b = b, a`** is the idiomatic Python swap — the right side is evaluated fully before any assignment.
- **Starred expressions** (`*rest`, `*middle`) handle variable-length sequences and eliminate the need for manual slicing.
- **`_`** signals a throwaway variable to both the reader and tools like linters.
- **`*args` and `**kwargs`** in function calls unpack sequences and dicts into positional and keyword arguments. Python 3.5+ allows multiple `*` unpacking in a single call.
- **`{**a, **b}`** merges dicts; later keys win. Python 3.9+ offers the cleaner `a | b` syntax.
- **Walrus (`:=`)** shines in `while` loops reading chunks, comprehension conditions that filter on an expensive check, and "if match, use match" patterns.
- **Walrus gotcha**: in comprehensions, walrus in the expression part leaks into the enclosing scope. Use it in the condition (`if` clause) to avoid this.
