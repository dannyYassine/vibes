---
title: "Optimization Techniques: slots, generators, strings"
description: "Apply targeted optimization techniques for common Python performance bottlenecks."
duration_minutes: 30
order: 2
---

## Algorithm First

The biggest performance wins almost never come from micro-optimizations — they come from choosing a better algorithm. Before thinking about local variable caches or string concatenation, ask: is this the right algorithm?

| Algorithm Change | Impact |
|---|---|
| O(n²) → O(n log n) sort | 1000-element list: 1M ops → 10K ops |
| O(n) linear search → O(1) dict lookup | Constant time regardless of n |
| Redundant DB queries → single query + dict | N queries → 1 query |
| Recomputing a result → caching it | Computation cost → near-zero |

A Python dict lookup will always beat a C-optimized linear scan once n is large enough. Write the correct algorithm first, then micro-optimize if the profiler still shows a problem.

---

## String Concatenation

One of the most common Python performance pitfalls is building a large string with the `+` operator in a loop.

### Why `+` is Slow for String Building

Strings in Python are immutable. Every `+` operation creates a brand-new string object and copies both operands into it. For N concatenations, you create N-1 intermediate strings and copy O(n²) total bytes.

```python
import timeit

# BAD: O(n^2) string copies
def build_with_plus(parts):
    result = ""
    for part in parts:
        result += part  # New allocation + copy on every iteration
    return result

# GOOD: collect parts, join once at the end
def build_with_join(parts):
    return "".join(parts)  # Single allocation

parts = [str(i) for i in range(10_000)]

t1 = timeit.timeit(lambda: build_with_plus(parts), number=100)
t2 = timeit.timeit(lambda: build_with_join(parts), number=100)

print(f"Plus operator:    {t1:.3f}s")
print(f"join():           {t2:.3f}s")
print(f"Speedup: {t1/t2:.1f}x")

# Typical output:
# Plus operator:    2.847s
# join():           0.041s
# Speedup: 69.4x
```

### The `join()` Pattern

Always collect string pieces into a list, then join at the end:

```python
# Building a CSV row
fields = ['Alice', '30', 'Engineer', 'New York']
row = ",".join(fields)  # "Alice,30,Engineer,New York"

# Building multiline output
lines = []
for item in data:
    lines.append(f"  - {item.name}: {item.value}")
output = "\n".join(lines)

# f-strings are fine for one-off formatting — the issue is only in loops
greeting = f"Hello, {name}!"  # This is fine
```

---

## List Building Strategies

### append() in a Loop is Acceptable

Python's `list.append()` is amortized O(1) — it occasionally doubles the internal buffer but is efficient on average. Don't avoid it out of fear.

```python
# This is fine
results = []
for item in items:
    if item.is_valid():
        results.append(item.process())
```

### List Comprehensions are Faster

List comprehensions are compiled to specialized bytecode that avoids the overhead of `LOAD_GLOBAL` for `append` on every iteration.

```python
import timeit

data = list(range(100_000))

def loop_append(data):
    result = []
    for x in data:
        result.append(x * 2)
    return result

def list_comp(data):
    return [x * 2 for x in data]

t1 = timeit.timeit(lambda: loop_append(data), number=100)
t2 = timeit.timeit(lambda: list_comp(data), number=100)

print(f"loop + append:       {t1:.3f}s")
print(f"list comprehension:  {t2:.3f}s")
print(f"Speedup: {t1/t2:.1f}x")
# Typical: ~1.4x speedup for list comp
```

### Pre-allocating When Size is Known

If you know the final size, pre-allocate and assign by index rather than appending:

```python
n = 100_000
result = [None] * n  # Pre-allocate
for i in range(n):
    result[i] = i * 2  # Assignment, no reallocation
```

This avoids even the occasional buffer doubling of `append()`. The difference is small for most cases, but relevant in tight numerical loops.

---

## Generator Expressions vs List Comprehensions

This is one of the most important distinctions for memory-efficient Python.

### List Comprehension: Eager, All in Memory

```python
# Allocates all 10 million integers at once — ~400MB
squares = [x**2 for x in range(10_000_000)]
total = sum(squares)
```

### Generator Expression: Lazy, O(1) Memory

```python
# Yields one value at a time — minimal memory
squares = (x**2 for x in range(10_000_000))
total = sum(squares)  # sum() pulls one value at a time
```

Both compute the same answer. The generator uses about 200 bytes regardless of n.

### When to Use Each

| Situation | Use |
|---|---|
| Iterate once (pass to `sum`, `max`, `any`, `all`) | Generator expression |
| Need to iterate multiple times | List comprehension |
| Need random access (`result[42]`) | List comprehension |
| Need `len()` | List comprehension |
| Chaining transformations in a pipeline | Generators |
| Result must be a list anyway | List comprehension |

```python
# Pipeline example: generators chain without intermediate lists
lines = open('big_file.txt')               # file is an iterator
stripped = (line.strip() for line in lines)
non_empty = (line for line in stripped if line)
words = (word for line in non_empty for word in line.split())
count = sum(1 for _ in words)  # Count total words — no intermediate lists

# vs the eager version that creates 4 large intermediate lists:
# lines = open(...).readlines()
# stripped = [line.strip() for line in lines]
# non_empty = [line for line in stripped if line]
# words = [word for line in non_empty for word in line.split()]
# count = len(words)
```

---

## Local Variable Cache: Avoiding Repeated Attribute Lookups

Python resolves names through a hierarchy: local → enclosing → global → built-in (LEGB). Local lookups use `LOAD_FAST` (an array index), while global and attribute lookups use dictionary-based `LOAD_GLOBAL` or `LOAD_ATTR` — significantly slower.

### Cache Function References Before Tight Loops

```python
import timeit
import math

# SLOW: resolves math.sqrt on every iteration
def slow_sqrt(data):
    return [math.sqrt(x) for x in data]

# FAST: resolve once before the loop
def fast_sqrt(data):
    sqrt = math.sqrt  # Cache the reference as a local variable
    return [sqrt(x) for x in data]

data = list(range(1, 100_001))
t1 = timeit.timeit(lambda: slow_sqrt(data), number=50)
t2 = timeit.timeit(lambda: fast_sqrt(data), number=50)
print(f"math.sqrt lookup: {t1:.3f}s")
print(f"cached sqrt:      {t2:.3f}s")
```

### Cache Object Method References

```python
# SLOW: looks up list.append in every iteration
def slow_build(n):
    result = []
    for i in range(n):
        result.append(i)  # append is re-resolved each time
    return result

# FAST: cache the method reference
def fast_build(n):
    result = []
    append = result.append  # Cache once
    for i in range(n):
        append(i)
    return result
```

Note: this technique matters most in very tight loops (millions of iterations). For typical code, the readability cost is not worth it.

---

## Built-in Functions: Faster Than Explicit Loops

Python's built-in functions (`sum`, `max`, `min`, `len`, `any`, `all`, `map`, `filter`, `sorted`) are implemented in C. They operate at C speed, skipping Python bytecode interpretation on every iteration.

```python
data = list(range(100_000))

# Python loop (bytecode interpreted per iteration)
def py_sum(data):
    total = 0
    for x in data:
        total += x
    return total

# C implementation
result = sum(data)

# Similarly:
maximum = max(data)          # C loop
result = any(x > 99_000 for x in data)  # Short-circuits in C
sorted_data = sorted(data, key=lambda x: -x)  # Timsort in C

# map() applies a C-callable without per-element Python overhead
squares = list(map(lambda x: x**2, data))  # Still has lambda overhead
# For maximum speed with numeric operations, use NumPy
```

---

## Set and Dict for Membership Testing

Membership testing (`x in collection`) is O(1) for sets and dicts, O(n) for lists and tuples.

```python
import timeit
import random

n = 100_000
data_list = list(range(n))
data_set = set(data_list)
data_dict = {x: True for x in data_list}

# Generate random lookups
lookups = [random.randint(0, n * 2) for _ in range(10_000)]

# O(n) per lookup — linear scan
def list_membership(lookups, collection):
    return [x in collection for x in lookups]

t_list = timeit.timeit(lambda: list_membership(lookups, data_list), number=10)
t_set  = timeit.timeit(lambda: list_membership(lookups, data_set), number=10)
t_dict = timeit.timeit(lambda: list_membership(lookups, data_dict), number=10)

print(f"List: {t_list:.3f}s")
print(f"Set:  {t_set:.3f}s")
print(f"Dict: {t_dict:.3f}s")
# Typical: set/dict are 50-100x faster for large collections
```

**Rule of thumb:** if you are building a collection for repeated membership testing, use a `set`. If you need to associate a value, use a `dict`. Converting a list to a set upfront is almost always worth it.

```python
# Pattern: convert once, test many times
valid_ids = set(fetch_all_ids_from_db())  # O(n) once
filtered = [record for record in records if record.id in valid_ids]  # O(1) per record
```

---

## `__slots__` for High-Frequency Objects

By default, Python stores instance attributes in a `__dict__` dictionary on each object. For classes where you create millions of instances, this has significant memory overhead.

```python
import sys

class PointDict:
    def __init__(self, x, y):
        self.x = x
        self.y = y

class PointSlots:
    __slots__ = ('x', 'y')

    def __init__(self, x, y):
        self.x = x
        self.y = y

p1 = PointDict(1.0, 2.0)
p2 = PointSlots(1.0, 2.0)

print(f"PointDict size:  {sys.getsizeof(p1)} bytes")  # ~48 bytes + dict overhead
print(f"PointSlots size: {sys.getsizeof(p2)} bytes")  # ~56 bytes (no __dict__)

# At scale: 1 million points
import tracemalloc
tracemalloc.start()
points_dict = [PointDict(i, i) for i in range(1_000_000)]
snap1 = tracemalloc.take_snapshot()

tracemalloc.stop()
tracemalloc.start()
points_slots = [PointSlots(i, i) for i in range(1_000_000)]
snap2 = tracemalloc.take_snapshot()
```

`__slots__` also makes attribute access slightly faster because it avoids the dict hash lookup.

**Trade-off:** `__slots__` objects cannot have arbitrary attributes added at runtime (no `obj.new_attr = ...` unless `__dict__` is in `__slots__`). Use `__slots__` only on classes where you create very many instances and the attribute set is fixed.

---

## io.StringIO for Building Large Strings

When building strings in complex, non-linear ways (not a simple loop), use `io.StringIO` as a mutable string buffer:

```python
import io

def build_html_table(data):
    buf = io.StringIO()
    write = buf.write
    write("<table>\n")
    for row in data:
        write("  <tr>")
        for cell in row:
            write(f"<td>{cell}</td>")
        write("</tr>\n")
    write("</table>")
    return buf.getvalue()

# vs building a list of strings and joining
def build_html_table_join(data):
    parts = ["<table>\n"]
    for row in data:
        parts.append("  <tr>")
        for cell in row:
            parts.append(f"<td>{cell}</td>")
        parts.append("</tr>\n")
    parts.append("</table>")
    return "".join(parts)
```

For simple loop patterns, `"".join(parts)` is usually cleaner. `StringIO` shines when you have deeply nested logic and passing a buffer object around is cleaner than threading a list through many function calls.

---

## functools.lru_cache for Expensive Pure Functions

If a function is pure (same inputs always produce same output, no side effects), caching its results eliminates redundant computation:

```python
from functools import lru_cache
import timeit

# Without cache: recomputes every time
def fib_slow(n):
    if n < 2:
        return n
    return fib_slow(n - 1) + fib_slow(n - 2)

# With cache: each unique n computed exactly once
@lru_cache(maxsize=None)
def fib_fast(n):
    if n < 2:
        return n
    return fib_fast(n - 1) + fib_fast(n - 2)

# Dramatic difference at n=35
t1 = timeit.timeit(lambda: fib_slow(30), number=1)
t2 = timeit.timeit(lambda: fib_fast(30), number=1)
print(f"Without cache: {t1:.3f}s")
print(f"With cache:    {t2:.6f}s")
```

---

## Lazy Imports: Reducing Startup Time

If a module is only used in a rarely executed code path, move the import inside the function. This reduces the application's startup time.

```python
# Slow startup: always imports heavy libraries at module load
import pandas as pd         # ~300ms import time
import matplotlib.pyplot as plt  # ~200ms import time

def generate_report(data):
    df = pd.DataFrame(data)
    return df.describe()

# Faster startup: import only when the function is actually called
def generate_report(data):
    import pandas as pd  # Imported only on first call; cached in sys.modules after
    df = pd.DataFrame(data)
    return df.describe()
```

This is particularly valuable for CLI tools where the command may not trigger the code path at all (e.g., `mytool --help` doesn't need pandas).

---

## Key Takeaways

- **Algorithm beats micro-optimization every time.** Fix O(n²) before worrying about local variable caches.
- **String concatenation in loops is O(n²) copies.** Always use `"".join(parts)` for building strings in loops.
- **List comprehensions outperform `append()` loops** by ~40% due to optimized bytecode. Use them when readable.
- **Generator expressions are O(1) memory.** Use them when you only need to iterate once — `sum(x**2 for x in data)` is just as fast as the list version and uses no extra memory.
- **Cache attribute and function references** before very tight loops to avoid repeated dictionary lookups.
- **Built-in functions run at C speed.** Prefer `sum()`, `max()`, `any()`, `all()` over equivalent Python loops.
- **`set` and `dict` membership is O(1).** Convert a list to a set before repeated membership tests.
- **`__slots__`** saves significant memory when creating millions of instances of the same class.
- **`lru_cache`** eliminates redundant computation for pure functions at the cost of memory.
- **Profile first.** None of these techniques matter if they are not in your hot path.
