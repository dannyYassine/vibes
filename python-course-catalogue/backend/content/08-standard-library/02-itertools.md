---
title: "itertools — Combinatorial & Infinite Iterators"
description: "Use itertools to write memory-efficient, expressive data pipelines."
duration_minutes: 30
order: 2
---

## itertools — Combinatorial & Infinite Iterators

`itertools` is one of Python's most elegant standard library modules. It provides building blocks for efficient iteration — all **lazy** (they compute values on demand) and **composable** (they chain naturally). Mastering itertools lets you write data pipelines that process arbitrarily large datasets with constant memory.

---

## Why itertools: Lazy Evaluation

```python
# Without itertools: materialise everything in memory
squares = [x**2 for x in range(10_000_000)]   # ~80 MB of RAM allocated immediately

# With itertools: generate on demand
import itertools
squares_gen = (x**2 for x in range(10_000_000))   # < 200 bytes!

# You only pay for what you consume
for sq in itertools.islice(squares_gen, 5):
    print(sq, end=" ")   # 0 1 4 9 16
```

Every function in `itertools` returns a lazy iterator. Convert to `list()` only when you need all values in memory.

---

## Infinite Iterators

These three iterators produce values indefinitely. Always pair them with a stopping condition (`islice`, `takewhile`, `zip`, or a `break`).

### count(start=0, step=1)

```python
from itertools import count

# Generates: start, start+step, start+2*step, ...
counter = count(1)
print(next(counter))   # 1
print(next(counter))   # 2

# Generate unique sequential IDs
import itertools
_id_counter = count(1000)

def generate_id() -> int:
    return next(_id_counter)

print(generate_id())   # 1000
print(generate_id())   # 1001
print(generate_id())   # 1002

# Float steps
for x in itertools.islice(count(0.0, 0.1), 5):
    print(f"{x:.1f}", end=" ")   # 0.0 0.1 0.2 0.3 0.4

# Use with zip to add indices (like enumerate but more flexible)
items = ["a", "b", "c"]
indexed = list(zip(count(10, 10), items))
print(indexed)   # [(10, 'a'), (20, 'b'), (30, 'c')]
```

### cycle(iterable)

```python
from itertools import cycle, islice

# Repeats the iterable forever
colors = cycle(["red", "green", "blue"])
print(list(islice(colors, 7)))
# ['red', 'green', 'blue', 'red', 'green', 'blue', 'red']

# Round-robin load balancing
servers = cycle(["server1", "server2", "server3"])
requests = ["req_a", "req_b", "req_c", "req_d", "req_e"]
assignments = [(req, next(servers)) for req in requests]
print(assignments)
# [('req_a', 'server1'), ('req_b', 'server2'), ('req_c', 'server3'),
#  ('req_d', 'server1'), ('req_e', 'server2')]

# CSS-style alternating row styles
row_styles = cycle(["row-odd", "row-even"])
rows = ["Alice", "Bob", "Charlie", "Dave"]
styled = list(zip(rows, row_styles))
print(styled)
# [('Alice', 'row-odd'), ('Bob', 'row-even'), ('Charlie', 'row-odd'), ('Dave', 'row-even')]
```

### repeat(obj, times=None)

```python
from itertools import repeat

# Repeat a single value n times
print(list(repeat("default", 5)))   # ['default', 'default', 'default', 'default', 'default']

# Useful with map() to supply a constant argument
from itertools import starmap
results = list(starmap(pow, zip(range(1, 6), repeat(2))))
print(results)   # [1, 4, 9, 16, 25]  — squares

# Filling missing values
data    = [1, 2, 3]
padding = repeat(0, 5 - len(data))
print(list(data) + list(padding))   # [1, 2, 3, 0, 0]
```

---

## Finite Iterators

### chain(*iterables)

Chains multiple iterables into one sequential stream without creating a new list.

```python
from itertools import chain

# Flatten one level
nested = [[1, 2, 3], [4, 5], [6, 7, 8, 9]]
flat = list(chain(*nested))
print(flat)   # [1, 2, 3, 4, 5, 6, 7, 8, 9]

# chain.from_iterable — when you have an iterable of iterables
flat2 = list(chain.from_iterable(nested))
print(flat2)   # same

# Concatenate multiple files without loading all into memory
def read_lines(*filenames):
    return chain.from_iterable(open(f, encoding="utf-8") for f in filenames)

# Combine iterables of different types
header = ["Name", "Age"]
row1   = ("Alice", 30)
row2   = ("Bob",   25)
all_rows = chain([header], [row1, row2])
for row in all_rows:
    print(row)
# ['Name', 'Age']
# ('Alice', 30)
# ('Bob', 25)
```

### islice(iterable, stop) / islice(iterable, start, stop, step)

Slices a lazy iterator — like `list[start:stop:step]` but for any iterable and without materialising it.

```python
from itertools import islice, count

# Take the first 5 from an infinite iterator
first_five_squares = list(islice((x**2 for x in count()), 5))
print(first_five_squares)   # [0, 1, 4, 9, 16]

# Skip the first 3, take the next 5
gen = (x * 10 for x in range(20))
chunk = list(islice(gen, 3, 8))
print(chunk)   # [30, 40, 50, 60, 70]

# Read a file in chunks
def read_in_chunks(filepath, chunk_size=1000):
    with open(filepath, encoding="utf-8") as f:
        while True:
            chunk = list(islice(f, chunk_size))
            if not chunk:
                break
            yield chunk   # process 1000 lines at a time

# Skip a header line from a generator
gen = iter(["header", "row1", "row2", "row3"])
next(gen)  # skip header
data = list(gen)
print(data)   # ['row1', 'row2', 'row3']
```

### takewhile and dropwhile

```python
from itertools import takewhile, dropwhile

# takewhile — yield while predicate is True, stop at first False
sorted_data = [1, 3, 5, 6, 7, 8, 9]
below_six = list(takewhile(lambda x: x < 6, sorted_data))
print(below_six)   # [1, 3, 5]   — stops at 6 even though 7,8,9 also qualify? No—
# NOTE: takewhile stops immediately at first False, does NOT skip and continue

# dropwhile — skip while predicate is True, then yield everything
after_header = list(dropwhile(lambda x: x < 6, sorted_data))
print(after_header)   # [6, 7, 8, 9]

# Real use: skip log file header lines
log_lines = [
    "# Log file v2.0",
    "# Generated: 2024-01-15",
    "# ---",
    "2024-01-15 INFO Server started",
    "2024-01-15 DEBUG Connection pool initialized",
]
data_lines = list(dropwhile(lambda l: l.startswith("#"), log_lines))
print(data_lines)
# ['2024-01-15 INFO Server started', '2024-01-15 DEBUG Connection pool initialized']
```

### filterfalse: Complement of filter

```python
from itertools import filterfalse

numbers = range(10)

evens = list(filter(lambda x: x % 2 == 0, numbers))     # [0, 2, 4, 6, 8]
odds  = list(filterfalse(lambda x: x % 2 == 0, numbers)) # [1, 3, 5, 7, 9]

# Partition a list into two groups in one pass
def partition(pred, iterable):
    """Return (true_items, false_items)."""
    from itertools import filterfalse, tee
    t1, t2 = tee(iterable)
    return list(filter(pred, t1)), list(filterfalse(pred, t2))

is_even = lambda x: x % 2 == 0
evens, odds = partition(is_even, range(10))
print(evens)   # [0, 2, 4, 6, 8]
print(odds)    # [1, 3, 5, 7, 9]
```

### compress: Mask-Based Filtering

```python
from itertools import compress

data      = ["Alice", "Bob", "Carol", "Dave", "Eve"]
selectors = [True, False, True, False, True]

selected = list(compress(data, selectors))
print(selected)   # ['Alice', 'Carol', 'Eve']

# Real use: apply a boolean mask from a database query
columns = ["id", "name", "email", "password_hash", "created_at"]
include = [True, True, True, False, True]   # hide password_hash

visible_columns = list(compress(columns, include))
print(visible_columns)   # ['id', 'name', 'email', 'created_at']
```

### starmap: map with Argument Unpacking

```python
from itertools import starmap

# Like map() but unpacks each tuple as *args
pairs = [(2, 3), (4, 5), (3, 2)]
powers = list(starmap(pow, pairs))
print(powers)   # [8, 125, 9]   (2^3, 4^5, 3^2)

# With a custom function
def add_weighted(value: float, weight: float) -> float:
    return value * weight

data = [(10.0, 0.5), (20.0, 0.3), (30.0, 0.2)]
weighted = list(starmap(add_weighted, data))
print(weighted)   # [5.0, 6.0, 6.0]
print(sum(weighted))   # 17.0
```

### zip_longest: Zip Without Truncation

```python
from itertools import zip_longest

names  = ["Alice", "Bob", "Charlie"]
scores = [92, 85]

# Regular zip stops at the shortest
print(list(zip(names, scores)))         # [('Alice', 92), ('Bob', 85)]

# zip_longest fills with None (or custom fillvalue)
print(list(zip_longest(names, scores, fillvalue=0)))
# [('Alice', 92), ('Bob', 85), ('Charlie', 0)]

# Merging two lists of different lengths
headers  = ["Name", "Score", "Grade"]
values   = ["Alice", 98]
pairs    = list(zip_longest(headers, values, fillvalue="N/A"))
print(pairs)
# [('Name', 'Alice'), ('Score', 98), ('Grade', 'N/A')]
```

### accumulate: Running Totals and More

```python
from itertools import accumulate
import operator

# Running sum (default)
data = [1, 2, 3, 4, 5]
running_sum = list(accumulate(data))
print(running_sum)   # [1, 3, 6, 10, 15]

# Running product
running_product = list(accumulate(data, operator.mul))
print(running_product)   # [1, 2, 6, 24, 120]

# Running maximum
temps = [22, 19, 25, 18, 28, 24]
running_max = list(accumulate(temps, max))
print(running_max)   # [22, 22, 25, 25, 28, 28]

# With initial value (Python 3.8+)
with_initial = list(accumulate([1, 2, 3, 4], initial=100))
print(with_initial)   # [100, 101, 103, 106, 110]

# Real use: compute cumulative percentages
category_sales = [("Electronics", 150_000), ("Clothing", 90_000),
                  ("Home", 60_000), ("Sports", 40_000)]
total = sum(v for _, v in category_sales)
cumulative = list(accumulate(
    (v / total * 100 for _, v in category_sales)
))
for (cat, _), cum_pct in zip(category_sales, cumulative):
    print(f"{cat:<15} {cum_pct:>6.1f}%")
# Electronics      44.1%
# Clothing         70.6%
# Home             88.2%
# Sports          100.0%
```

---

## Combinatorial Iterators

### product: Cartesian Product

```python
from itertools import product

# All combinations of two iterables
for combo in product([1, 2], ["a", "b", "c"]):
    print(combo, end="  ")
# (1, 'a')  (1, 'b')  (1, 'c')  (2, 'a')  (2, 'b')  (2, 'c')

# Equivalent to nested loops
for x in [1, 2]:
    for y in ["a", "b", "c"]:
        pass  # same order as product

# repeat parameter — same iterable repeated r times
dice_rolls = list(product(range(1, 7), repeat=2))
print(len(dice_rolls))    # 36  (all possible two-dice outcomes)
print(dice_rolls[:5])
# [(1, 1), (1, 2), (1, 3), (1, 4), (1, 5)]

# Test parameter grid — all combinations of hyperparameters
param_grid = list(product(
    [0.001, 0.01, 0.1],      # learning_rate
    [32, 64, 128],            # batch_size
    ["relu", "tanh"],         # activation
))
print(f"{len(param_grid)} total configurations to test")  # 18
for lr, bs, act in param_grid[:3]:
    print(f"  lr={lr}, batch={bs}, activation={act}")
```

### permutations and combinations

```python
from itertools import permutations, combinations, combinations_with_replacement

items = ["A", "B", "C", "D"]

# permutations(it, r) — ordered arrangements of r items
perms = list(permutations(items, 2))
print(f"P(4,2) = {len(perms)}")   # 12
print(perms[:4])   # [('A', 'B'), ('A', 'C'), ('A', 'D'), ('B', 'A')]

# combinations(it, r) — unordered selections (no repeats, order doesn't matter)
combos = list(combinations(items, 2))
print(f"C(4,2) = {len(combos)}")   # 6
print(combos)   # [('A', 'B'), ('A', 'C'), ('A', 'D'), ('B', 'C'), ('B', 'D'), ('C', 'D')]

# combinations_with_replacement — allows repeating items
with_rep = list(combinations_with_replacement("ABC", 2))
print(with_rep)
# [('A', 'A'), ('A', 'B'), ('A', 'C'), ('B', 'B'), ('B', 'C'), ('C', 'C')]

# Real use: find all pairs of users to compare
usernames = ["alice", "bob", "carol", "dave"]
pairs_to_compare = list(combinations(usernames, 2))
print(f"Need to compare {len(pairs_to_compare)} pairs:")
for u1, u2 in pairs_to_compare:
    print(f"  {u1} vs {u2}")
# 6 pairs (C(4,2))

# Password generation example
import string
chars = string.digits + string.ascii_lowercase[:4]  # "0123456789abcd"
# Count how many 3-char passwords without repeats exist
n = sum(1 for _ in permutations(chars, 3))
print(f"3-char passwords: {n:,}")  # 2,184
```

---

## groupby: Group Consecutive Elements

`groupby` groups **consecutive** elements with the same key. You MUST sort the data first if you want all records with the same key grouped together.

```python
from itertools import groupby

# Basic usage
data = [1, 1, 2, 2, 2, 3, 1, 1]
for key, group in groupby(data):
    print(f"Key={key}: {list(group)}")
# Key=1: [1, 1]
# Key=2: [2, 2, 2]
# Key=3: [3]
# Key=1: [1, 1]   ← note: 1 appears twice because data wasn't sorted!

# ALWAYS SORT FIRST if you want all matching items grouped
sorted_data = sorted(data)
for key, group in groupby(sorted_data):
    print(f"Key={key}: {list(group)}")
# Key=1: [1, 1, 1, 1]
# Key=2: [2, 2, 2]
# Key=3: [3]

# Real use: group sorted log entries by date
from datetime import date

log_entries = [
    {"date": date(2024, 1, 15), "level": "INFO",  "msg": "Server started"},
    {"date": date(2024, 1, 15), "level": "ERROR", "msg": "DB connection failed"},
    {"date": date(2024, 1, 16), "level": "INFO",  "msg": "Server started"},
    {"date": date(2024, 1, 16), "level": "WARN",  "msg": "High memory usage"},
    {"date": date(2024, 1, 16), "level": "INFO",  "msg": "Backup completed"},
]

# Sort by date (already sorted in this example)
sorted_entries = sorted(log_entries, key=lambda e: e["date"])

for log_date, entries in groupby(sorted_entries, key=lambda e: e["date"]):
    entry_list = list(entries)
    print(f"\n{log_date} ({len(entry_list)} entries):")
    for e in entry_list:
        print(f"  [{e['level']}] {e['msg']}")

# Group employees by department — must sort first!
employees = [
    {"name": "Alice",   "dept": "Engineering"},
    {"name": "Bob",     "dept": "Marketing"},
    {"name": "Carol",   "dept": "Engineering"},
    {"name": "Dave",    "dept": "HR"},
    {"name": "Eve",     "dept": "Marketing"},
]
employees.sort(key=lambda e: e["dept"])

dept_groups = {
    dept: [e["name"] for e in group]
    for dept, group in groupby(employees, key=lambda e: e["dept"])
}
print(dept_groups)
# {'Engineering': ['Alice', 'Carol'], 'HR': ['Dave'], 'Marketing': ['Bob', 'Eve']}
```

---

## Building Memory-Efficient Data Pipelines

The real power of itertools comes from composing multiple functions into a pipeline where data flows lazily through each stage.

```python
from itertools import chain, islice, filterfalse, starmap, groupby
import csv
import json
from io import StringIO

# Simulated large CSV of events
csv_data = """timestamp,level,service,message
2024-01-15T10:00:01,INFO,auth,User login
2024-01-15T10:00:02,ERROR,db,Connection timeout
2024-01-15T10:00:03,INFO,api,Request received
2024-01-15T10:00:04,ERROR,auth,Invalid token
2024-01-15T10:00:05,WARN,db,Slow query
2024-01-15T10:00:06,ERROR,api,Rate limit exceeded
"""

def parse_csv_rows(text: str):
    reader = csv.DictReader(StringIO(text))
    return reader

def is_error(row: dict) -> bool:
    return row["level"] == "ERROR"

def to_alert(row: dict) -> dict:
    return {
        "time":    row["timestamp"],
        "service": row["service"],
        "alert":   row["message"].upper(),
    }

# Pipeline: parse → filter errors → transform → take first 10
rows    = parse_csv_rows(csv_data)
errors  = filter(is_error, rows)
alerts  = map(to_alert, errors)
top_ten = islice(alerts, 10)

print("Alerts:")
for alert in top_ten:
    print(f"  [{alert['time']}] {alert['service']}: {alert['alert']}")
# [2024-01-15T10:00:02] db: CONNECTION TIMEOUT
# [2024-01-15T10:00:04] auth: INVALID TOKEN
# [2024-01-15T10:00:06] api: RATE LIMIT EXCEEDED


# Sliding window implementation using islice and deque
from collections import deque

def sliding_window(iterable, n: int):
    """Generate overlapping windows of size n."""
    it = iter(iterable)
    window = deque(islice(it, n), maxlen=n)
    if len(window) == n:
        yield tuple(window)
    for item in it:
        window.append(item)
        yield tuple(window)

prices = [10, 12, 11, 14, 13, 16, 15, 18]
windows = list(sliding_window(prices, 3))
print("3-day windows:", windows)
# [(10, 12, 11), (12, 11, 14), (11, 14, 13), (14, 13, 16), (13, 16, 15), (16, 15, 18)]

averages = [sum(w) / len(w) for w in windows]
print("Moving averages:", [f"{a:.1f}" for a in averages])
# ['11.0', '12.3', '12.7', '14.3', '14.7', '16.3']
```

---

## Generating All Test Parameter Combinations

```python
from itertools import product
import pytest  # hypothetical

# API endpoint testing: all method × status-code combinations
methods    = ["GET", "POST", "PUT", "DELETE"]
endpoints  = ["/users", "/posts", "/comments"]
auth_modes = ["bearer", "api_key", "none"]

test_cases = list(product(methods, endpoints, auth_modes))
print(f"Generated {len(test_cases)} test cases")   # 36

for method, endpoint, auth in test_cases[:4]:
    print(f"  {method} {endpoint} (auth={auth})")
# GET /users (auth=bearer)
# GET /users (auth=api_key)
# GET /users (auth=none)
# GET /posts (auth=bearer)

# Generating combinations for integration tests
database_types = ["sqlite", "postgres"]
cache_backends = ["memory", "redis"]
log_levels     = ["DEBUG", "WARNING"]

configs = [
    {"db": db, "cache": cache, "log": log}
    for db, cache, log in product(database_types, cache_backends, log_levels)
]
print(f"Integration test matrix: {len(configs)} configurations")
```

---

## Key Takeaways

- All `itertools` functions return **lazy iterators**. They never load the entire dataset into memory. Wrap in `list()` only when you need all values.
- **Infinite iterators** (`count`, `cycle`, `repeat`) must always be bounded by `islice`, `takewhile`, `zip`, or another terminating operation.
- `chain` / `chain.from_iterable` flatten nested iterables without copying. Use them instead of `+` on lists when dealing with large data.
- `islice` brings list-slicing semantics to lazy iterators — essential for reading large files in chunks.
- `groupby` groups **consecutive** equal elements. Always sort by the grouping key before calling it, or you will get multiple groups for the same key.
- `accumulate` computes running totals (or any other running aggregate). The `initial` parameter (Python 3.8+) is useful for starting from a non-zero base.
- `product`, `permutations`, `combinations` are your tools for exhaustive combinatorial testing, configuration matrices, and brute-force search.
- Compose itertools functions into **pipelines**: `filter` → `map` → `islice` → `groupby` gives you a memory-efficient ETL chain that processes one element at a time.
