---
title: "20 Pythonic Patterns Every Dev Should Know"
description: "Practical idioms that make Python code cleaner, faster, and more readable."
duration_minutes: 30
order: 5
---

## Overview

Pythonic code is not just about making things shorter — it is about using the language the way it was designed to be used. These 20 patterns are the most impactful idioms you can adopt. Each one has a concrete before/after comparison so you can see exactly what changes and why.

---

## 1. enumerate() Instead of range(len())

```python
fruits = ["apple", "banana", "cherry"]

# Non-Pythonic
for i in range(len(fruits)):
    print(i, fruits[i])

# Pythonic — enumerate gives (index, value) pairs
for i, fruit in enumerate(fruits):
    print(i, fruit)

# Start index at 1
for i, fruit in enumerate(fruits, start=1):
    print(f"{i}. {fruit}")

# Pitfall of range(len): breaks with non-sequence iterables
# enumerate() works with any iterable
```

---

## 2. zip() to Iterate Multiple Sequences in Parallel

```python
names  = ["Alice", "Bob", "Carol"]
scores = [95, 82, 78]
grades = ["A", "B", "C"]

# Non-Pythonic
for i in range(len(names)):
    print(names[i], scores[i], grades[i])

# Pythonic
for name, score, grade in zip(names, scores, grades):
    print(f"{name}: {score} ({grade})")

# zip() stops at the shortest iterable
# Use itertools.zip_longest() if you need to handle different lengths

from itertools import zip_longest
for name, score in zip_longest(names, [95, 82], fillvalue="N/A"):
    print(name, score)
# Alice 95, Bob 82, Carol N/A

# Build a dict from two parallel lists
mapping = dict(zip(names, scores))
print(mapping)   # {'Alice': 95, 'Bob': 82, 'Carol': 78}

# Unzip (transpose): split a list of pairs back into two lists
pairs = [(1, "a"), (2, "b"), (3, "c")]
numbers, letters = zip(*pairs)
print(numbers)   # (1, 2, 3)
print(letters)   # ('a', 'b', 'c')
```

---

## 3. dict.get(key, default) to Avoid KeyError

```python
counts = {"apple": 5, "banana": 3}

# Non-Pythonic — raises KeyError if key missing
count = counts["cherry"]   # KeyError!

# Better but verbose
if "cherry" in counts:
    count = counts["cherry"]
else:
    count = 0

# Pythonic
count = counts.get("cherry", 0)
print(count)   # 0

# For nested dicts, chain .get() calls
config = {"db": {"host": "localhost"}}
port = config.get("db", {}).get("port", 5432)
print(port)   # 5432
```

---

## 4. defaultdict for Accumulation Patterns

```python
from collections import defaultdict

words = ["apple", "banana", "avocado", "blueberry", "apricot"]

# Non-Pythonic — check-and-set pattern
by_letter = {}
for word in words:
    letter = word[0]
    if letter not in by_letter:
        by_letter[letter] = []
    by_letter[letter].append(word)

# Pythonic — defaultdict handles missing keys automatically
by_letter = defaultdict(list)
for word in words:
    by_letter[word[0]].append(word)

print(dict(by_letter))
# {'a': ['apple', 'avocado', 'apricot'], 'b': ['banana', 'blueberry']}

# Count occurrences
from collections import Counter  # even better for pure counting
word_counts = Counter(words)

# defaultdict(int) for manual counting
char_freq = defaultdict(int)
for char in "mississippi":
    char_freq[char] += 1
print(dict(char_freq))  # {'m': 1, 'i': 4, 's': 4, 'p': 2}

# defaultdict(set) for deduplication while grouping
seen_by_category = defaultdict(set)
data = [("fruit", "apple"), ("veggie", "carrot"), ("fruit", "apple"), ("fruit", "pear")]
for category, item in data:
    seen_by_category[category].add(item)
```

---

## 5. Conditional Expression (Ternary)

```python
age = 20

# Non-Pythonic
if age >= 18:
    status = "adult"
else:
    status = "minor"

# Pythonic — inline conditional expression
status = "adult" if age >= 18 else "minor"
print(status)

# Good uses: simple assignments, function arguments, list elements
label = "positive" if value > 0 else ("negative" if value < 0 else "zero")

# Avoid chaining too deep — readability suffers
# If you need more than one else, use a regular if/elif/else block
```

---

## 6. any() and all() with Generator Expressions

```python
numbers = [2, 4, 6, 7, 8, 10]

# Non-Pythonic — builds an intermediate list
if True in [n % 2 == 1 for n in numbers]:
    print("Has an odd number")

# Pythonic — generator expression, short-circuits as soon as possible
if any(n % 2 == 1 for n in numbers):
    print("Has an odd number")    # stops at 7, doesn't check 8, 10

if all(n > 0 for n in numbers):
    print("All positive")

# any() on an empty iterable is False
print(any(x > 0 for x in []))    # False

# all() on an empty iterable is True (vacuously true)
print(all(x > 0 for x in []))    # True

# Real use: validation
def validate_scores(scores: list[int]) -> bool:
    return all(0 <= s <= 100 for s in scores)

# Check if any item matches a condition
users = [{"name": "Alice", "admin": False}, {"name": "Bob", "admin": True}]
has_admin = any(u["admin"] for u in users)
```

---

## 7. Context Managers for All Resources

```python
# Non-Pythonic — resource may leak if exception occurs
f = open("data.txt")
data = f.read()
f.close()   # not called if read() raises!

# Pythonic — guaranteed cleanup via context manager
with open("data.txt", encoding="utf-8") as f:
    data = f.read()
# f is closed here no matter what

# Multiple resources in one with statement (Python 3.10+)
with open("input.txt") as src, open("output.txt", "w") as dst:
    dst.write(src.read().upper())

# Database connections, locks, temp directories
import threading, tempfile
from pathlib import Path

lock = threading.Lock()
with lock:
    # critical section — lock is always released
    shared_resource.update()

with tempfile.TemporaryDirectory() as tmp:
    work_dir = Path(tmp)
    # do work — directory auto-deleted on exit
```

---

## 8. Generator Expressions vs List Comprehensions

```python
data = range(1_000_000)

# List comprehension — builds entire list in memory
squares_list = [x**2 for x in data]           # uses ~8 MB

# Generator expression — lazy, one item at a time
squares_gen  = (x**2 for x in data)           # uses ~200 bytes

# Use list comprehension when:
#   - You need the result more than once
#   - You need len(), random access, or list methods
#   - The result is small

# Use generator expression when:
#   - You only need to iterate once
#   - The input is large or infinite
#   - Passing directly to sum(), min(), max(), any(), all()

total = sum(x**2 for x in range(1_000_000))   # never builds a list

# Nested comprehensions — list for matrix operations
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat   = [cell for row in matrix for cell in row]
# [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Conditional comprehension (filter)
evens = [x for x in range(20) if x % 2 == 0]
```

---

## 9. Unpack Function Return Values

```python
import os

# Non-Pythonic — return a single container and index into it
def get_file_info(path):
    stat = os.stat(path)
    return (stat.st_size, stat.st_mtime, stat.st_mode)

info = get_file_info("/etc/hosts")
size = info[0]   # fragile — what is index 2?

# Pythonic — return multiple values (Python returns a tuple)
def get_file_info(path: str) -> tuple[int, float, int]:
    stat = os.stat(path)
    return stat.st_size, stat.st_mtime, stat.st_mode

size, mtime, mode = get_file_info("/etc/hosts")   # self-documenting

# Or use a dataclass/NamedTuple for richer return values
from typing import NamedTuple

class FileInfo(NamedTuple):
    size: int
    mtime: float
    mode: int

def get_file_info(path: str) -> FileInfo:
    stat = os.stat(path)
    return FileInfo(stat.st_size, stat.st_mtime, stat.st_mode)

info = get_file_info("/etc/hosts")
print(info.size)    # named access — no guessing what index means
```

---

## 10. _ for Throwaway Loop Variables

```python
# Running something N times without needing the counter
for _ in range(5):
    send_ping()

# Ignoring parts of unpacked tuples
for _, value in some_dict.items():   # only care about values
    process(value)

first, *_, last = large_sequence     # only want first and last

# In unpacking where one element is irrelevant
x, _, z = get_coordinates_3d()      # ignore y
```

---

## 11. Chained Comparisons

```python
x = 5

# Non-Pythonic — verbose C-style
if x > 0 and x < 10:
    print("single digit positive")

# Pythonic — chained comparison, reads like math
if 0 < x < 10:
    print("single digit positive")

# Works with any comparison operators, any number of terms
if 0 <= age <= 120:
    valid_age = True

if low <= value <= high:
    in_range = True

# Check sorted order
a, b, c = 1, 2, 3
print(a < b < c)   # True  — both conditions checked, b evaluated once
print(a < c > b)   # True  — a < c AND c > b
```

---

## 12. "".join(parts) Instead of String += in Loops

```python
words = ["Hello", " ", "World", "!"]

# Non-Pythonic — O(n²) because strings are immutable
result = ""
for word in words:
    result += word   # creates a new string object each iteration!

# Pythonic — O(n) — join collects all parts then concatenates once
result = "".join(words)

# Building comma-separated output
items = ["apple", "banana", "cherry"]
print(", ".join(items))    # "apple, banana, cherry"

# Building lines for a report
lines = []
for row in data:
    lines.append(format_row(row))
report = "\n".join(lines)

# Common f-string + join pattern
names = ["Alice", "Bob", "Carol"]
print(" | ".join(f"[{n}]" for n in names))
# "[Alice] | [Bob] | [Carol]"
```

---

## 13. Dict Comprehensions

```python
keys   = ["a", "b", "c"]
values = [1, 2, 3]

# Non-Pythonic
d = {}
for k, v in zip(keys, values):
    d[k] = v

# Pythonic — dict comprehension
d = {k: v for k, v in zip(keys, values)}

# Transform existing dict
prices = {"apple": 1.0, "banana": 0.5, "cherry": 2.0}
discounted = {item: price * 0.9 for item, price in prices.items()}

# Filter a dict
expensive = {item: price for item, price in prices.items() if price > 0.75}

# Invert a dict (assumes values are unique)
inverted = {v: k for k, v in prices.items()}

# Word frequency (same as Counter but illustrative)
text = "the cat sat on the mat the cat"
freq = {word: text.split().count(word) for word in set(text.split())}
```

---

## 14. Set for Fast Membership Testing

```python
valid_users = ["alice", "bob", "charlie", "dave", "eve"]

# Non-Pythonic — O(n) per lookup
def is_valid(name: str) -> bool:
    return name in valid_users   # linear scan every time!

# Pythonic — convert to set once for O(1) lookups
valid_users_set = set(valid_users)

def is_valid(name: str) -> bool:
    return name in valid_users_set   # hash lookup, O(1)

# For a fixed collection that is checked in a loop
STOP_WORDS = {"the", "a", "an", "and", "or", "but", "in", "on", "at"}
words = text.lower().split()
meaningful = [w for w in words if w not in STOP_WORDS]

# Set operations
allowed  = {"read", "write", "execute"}
user_perms = {"read", "write"}
print(user_perms.issubset(allowed))            # True
print(user_perms & allowed)                    # {'read', 'write'}  (intersection)
print(allowed - user_perms)                    # {'execute'}  (difference)
```

---

## 15. Walrus in while Loop for Chunk Reading

```python
# Non-Pythonic — repeated read call
CHUNK_SIZE = 8192
with open("big_file.bin", "rb") as f:
    chunk = f.read(CHUNK_SIZE)
    while chunk:
        process(chunk)
        chunk = f.read(CHUNK_SIZE)   # duplicated

# Pythonic — walrus operator
with open("big_file.bin", "rb") as f:
    while chunk := f.read(CHUNK_SIZE):
        process(chunk)

# Same pattern for line-by-line from a socket or pipe
import subprocess
proc = subprocess.Popen(["tail", "-f", "/var/log/system.log"],
                        stdout=subprocess.PIPE, text=True)
while line := proc.stdout.readline():
    process_log_line(line.rstrip())
```

---

## 16. functools.lru_cache to Memoize Expensive Functions

```python
from functools import lru_cache, cache

# Non-Pythonic — manual dict cache (verbose and error-prone)
_cache = {}
def fibonacci(n):
    if n in _cache:
        return _cache[n]
    if n < 2:
        return n
    result = fibonacci(n-1) + fibonacci(n-2)
    _cache[n] = result
    return result

# Pythonic — decorator handles everything
@cache   # or @lru_cache(maxsize=128) for bounded cache
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Also useful for configuration loading, API calls, DB lookups
@lru_cache(maxsize=256)
def load_config(env: str) -> dict:
    return read_config_file(f"config.{env}.json")
```

---

## 17. __slots__ for Classes with Many Instances

```python
# Regular class — each instance has a __dict__ (uses ~300 bytes)
class Point:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

# With __slots__ — no __dict__, uses ~60 bytes per instance
class PointSlots:
    __slots__ = ("x", "y")

    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

# Significant for large collections
import sys
points_regular = [Point(i, i) for i in range(100_000)]
points_slots   = [PointSlots(i, i) for i in range(100_000)]

print(sys.getsizeof(points_regular[0]))   # ~48 bytes + __dict__ overhead
print(sys.getsizeof(points_slots[0]))     # ~48 bytes (no __dict__)

# Trade-offs: cannot add new attributes dynamically, no __dict__, no weakref by default
# Best for: high-frequency value objects (pixels, coordinates, records)
```

---

## 18. pathlib.Path Over os.path String Manipulation

```python
import os
from pathlib import Path

# Non-Pythonic — string manipulation
data_dir = os.path.join(os.path.expanduser("~"), "data")
file_path = os.path.join(data_dir, "report.csv")
stem = os.path.splitext(os.path.basename(file_path))[0]
parent = os.path.dirname(file_path)

# Pythonic — OOP path objects
data_dir  = Path.home() / "data"
file_path = data_dir / "report.csv"
stem      = file_path.stem      # "report"
parent    = file_path.parent    # ~/data

# Reading and writing — no open() needed for small files
config = (Path.home() / ".config" / "app" / "settings.json")
if config.is_file():
    text = config.read_text(encoding="utf-8")

# Glob for file discovery
py_files = list(Path(".").rglob("*.py"))
```

---

## 19. @dataclass for Data Container Classes

```python
# Non-Pythonic — manual boilerplate
class User:
    def __init__(self, name: str, age: int, email: str):
        self.name  = name
        self.age   = age
        self.email = email

    def __repr__(self):
        return f"User(name={self.name!r}, age={self.age!r}, email={self.email!r})"

    def __eq__(self, other):
        return (self.name, self.age, self.email) == (other.name, other.age, other.email)

# Pythonic — @dataclass generates all of this automatically
from dataclasses import dataclass, field
from typing import ClassVar

@dataclass
class User:
    name:  str
    age:   int
    email: str
    tags:  list[str] = field(default_factory=list)   # mutable default — NEVER use []

    # Class variable (not a field)
    max_age: ClassVar[int] = 150

@dataclass(frozen=True)   # immutable (hashable, usable in sets/dicts)
class Point:
    x: float
    y: float

@dataclass(order=True)    # generates __lt__, __le__, __gt__, __ge__
class Version:
    major: int
    minor: int
    patch: int

v1 = Version(1, 2, 3)
v2 = Version(1, 3, 0)
print(v1 < v2)   # True — comparison generated by @dataclass(order=True)
```

---

## 20. logging Module Instead of print() in Production

```python
# Non-Pythonic in production code
def process(data):
    print(f"Processing {len(data)} items")
    result = compute(data)
    print(f"Done: {result}")
    return result

# Pythonic — structured, configurable, filterable
import logging

logger = logging.getLogger(__name__)   # use module name as logger name

def process(data):
    logger.debug("Processing %d items", len(data))
    result = compute(data)
    logger.info("Processing complete: result=%r", result)
    return result

# Configuration (typically in main.py or settings)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(),                           # console
        logging.FileHandler("app.log", encoding="utf-8"), # file
    ]
)

# Benefits over print():
# - Log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL) — filter without code changes
# - Structured output with timestamps, module names, line numbers
# - Can redirect to files, network, syslog without changing application code
# - Performance: disabled log levels have near-zero cost (lazy string formatting)
# - logger.debug("Expensive: %s", expensive_call())  — string only built if DEBUG enabled
```

---

## Key Takeaways

- **`enumerate()` and `zip()`** replace index arithmetic and make loop intent explicit.
- **`dict.get(key, default)`** is always safer than direct key access for optional keys. Use `defaultdict` for accumulation.
- **`any()` and `all()`** with generator expressions short-circuit — they stop as soon as the answer is known, and they never build an intermediate list.
- **Context managers** (`with`) guarantee resource cleanup even when exceptions occur. Use them for files, locks, network connections, and temp directories.
- **Generator expressions** (`(x for x in ...)`) are memory-efficient for one-pass iteration. List comprehensions (`[x for x in ...]`) are for when you need a reusable list.
- **`"".join(parts)`** is O(n). String `+=` in a loop is O(n²). This matters for large outputs.
- **Sets** provide O(1) membership testing. If you check `in` against a collection more than a few times, convert it to a set first.
- **`@dataclass`** eliminates `__init__`, `__repr__`, and `__eq__` boilerplate. Use `field(default_factory=list)` for mutable defaults.
- **`logging`** gives you levels, timestamps, module names, and output flexibility. Replace `print()` with `logger.info()` before code leaves your laptop.
- **`pathlib.Path`** replaces `os.path` string operations with readable, cross-platform attribute access and method chaining.
