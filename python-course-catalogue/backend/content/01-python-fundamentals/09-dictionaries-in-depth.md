---
title: "Dictionaries In Depth"
description: "Deep dive into Python dicts — iteration, comprehensions, merging, and internals."
duration_minutes: 25
order: 9
---

## Dictionaries In Depth

Dictionaries are Python's most powerful built-in data structure. They map **hashable keys** to arbitrary values with O(1) average-case access, insertion, and deletion. This lesson covers the full dict API, iteration patterns, merging strategies, and common pitfalls.

---

## Creating Dictionaries

```python
# Dict literal
user = {
    "name": "Alice",
    "age": 30,
    "email": "alice@example.com",
}

# dict() constructor with keyword arguments
config = dict(host="localhost", port=5432, dbname="mydb")
print(config)  # {'host': 'localhost', 'port': 5432, 'dbname': 'mydb'}

# dict() from a list of (key, value) pairs
pairs = [("a", 1), ("b", 2), ("c", 3)]
d = dict(pairs)
print(d)  # {'a': 1, 'b': 2, 'c': 3}

# dict.fromkeys(keys, default_value)
keys = ["host", "port", "user", "password"]
template = dict.fromkeys(keys, None)
print(template)
# {'host': None, 'port': None, 'user': None, 'password': None}

# Gotcha: fromkeys shares the SAME object as the default value
# BAD — all keys point to the same list:
bad = dict.fromkeys(["a", "b", "c"], [])
bad["a"].append(1)
print(bad)  # {'a': [1], 'b': [1], 'c': [1]}  — ALL lists mutated!

# GOOD — use a comprehension when the default is mutable:
good = {k: [] for k in ["a", "b", "c"]}
good["a"].append(1)
print(good)  # {'a': [1], 'b': [], 'c': []}   — correct

# Dict comprehension
squares = {x: x**2 for x in range(1, 6)}
print(squares)  # {1: 1, 2: 4, 3: 9, 4: 16, 5: 25}
```

---

## Accessing Values

```python
d = {"name": "Alice", "age": 30, "city": "NYC"}

# [] — raises KeyError if key is missing
print(d["name"])     # Alice
# print(d["email"]) # KeyError: 'email'

# get(key, default=None) — safe access, never raises
print(d.get("name"))           # Alice
print(d.get("email"))          # None
print(d.get("email", "N/A"))   # N/A

# Practical: counting with get
votes = ["yes", "no", "yes", "yes", "no", "abstain"]
tally = {}
for v in votes:
    tally[v] = tally.get(v, 0) + 1
print(tally)  # {'yes': 3, 'no': 2, 'abstain': 1}

# setdefault(key, default) — inserts default if key is missing, returns value
inventory = {"apples": 5}
inventory.setdefault("bananas", 0)   # inserts bananas=0
inventory.setdefault("apples", 100)  # no-op — apples already exists
print(inventory)   # {'apples': 5, 'bananas': 0}

# Grouping with setdefault
students = [
    {"name": "Alice", "grade": "A"},
    {"name": "Bob",   "grade": "B"},
    {"name": "Carol", "grade": "A"},
    {"name": "Dave",  "grade": "B"},
]
by_grade = {}
for s in students:
    by_grade.setdefault(s["grade"], []).append(s["name"])
print(by_grade)  # {'A': ['Alice', 'Carol'], 'B': ['Bob', 'Dave']}
```

---

## Iterating Over Dictionaries

```python
config = {"host": "localhost", "port": 5432, "debug": True}

# Iterating directly gives keys (Python 3.7+: guaranteed insertion order)
for key in config:
    print(key)

# .keys() — explicit, returns a dict_keys view
for key in config.keys():
    print(key)

# .values() — returns a dict_values view
for val in config.values():
    print(val)

# .items() — returns (key, value) pairs — most useful
for key, val in config.items():
    print(f"{key!r:15} = {val!r}")

# With enumerate — when you need an index too
for i, (key, val) in enumerate(config.items()):
    print(f"{i}: {key} = {val}")

# Dict views are live — they reflect changes to the underlying dict
keys_view = config.keys()
config["new_key"] = "new_value"
print("new_key" in keys_view)  # True — view reflects change

# Views support set operations
a = {"x": 1, "y": 2, "z": 3}
b = {"y": 20, "z": 30, "w": 40}
print(a.keys() & b.keys())    # {'y', 'z'}  — common keys
print(a.keys() | b.keys())    # {'x', 'y', 'z', 'w'}
print(a.keys() - b.keys())    # {'x'}  — keys only in a
```

---

## Mutating Dictionaries

```python
d = {"a": 1, "b": 2, "c": 3}

# update() — merge/overwrite from another dict or iterable of pairs
d.update({"b": 20, "d": 4})
print(d)  # {'a': 1, 'b': 20, 'c': 3, 'd': 4}

d.update(e=5, f=6)  # keyword arguments
print(d)  # {'a': 1, 'b': 20, 'c': 3, 'd': 4, 'e': 5, 'f': 6}

# pop(key) — removes and returns value, raises KeyError if missing
val = d.pop("f")
print(val)   # 6

# pop(key, default) — safe pop
val = d.pop("missing", "default_val")
print(val)   # default_val

# popitem() — removes and returns the LAST inserted (key, value) pair
# Useful for iterating while consuming
d = {"a": 1, "b": 2, "c": 3}
while d:
    k, v = d.popitem()
    print(f"Processing {k}={v}")
# c=3, b=2, a=1 (LIFO order)

# del d[key] — raises KeyError if missing
d = {"a": 1, "b": 2}
del d["a"]
print(d)  # {'b': 2}

# Clearing
d.clear()
print(d)  # {}
```

---

## Dict Comprehensions

```python
# Basic: invert a dict (swap keys and values)
original = {"a": 1, "b": 2, "c": 3}
inverted = {v: k for k, v in original.items()}
print(inverted)  # {1: 'a', 2: 'b', 3: 'c'}

# Filter: keep only passing grades
grades = {"Alice": 92, "Bob": 55, "Carol": 78, "Dave": 41, "Eve": 88}
passing = {name: score for name, score in grades.items() if score >= 60}
print(passing)  # {'Alice': 92, 'Carol': 78, 'Eve': 88}

# Transform values
import os
env_vars = {"HOME": "/Users/alice", "PATH": "/usr/bin:/bin", "SHELL": "/bin/zsh"}
lengths = {k: len(v) for k, v in env_vars.items()}
print(lengths)  # {'HOME': 13, 'PATH': 15, 'SHELL': 9}

# Build a lookup table from a list of objects
records = [
    {"id": 1, "name": "Alice", "role": "admin"},
    {"id": 2, "name": "Bob",   "role": "user"},
    {"id": 3, "name": "Carol", "role": "user"},
]
by_id = {r["id"]: r for r in records}
print(by_id[2])   # {'id': 2, 'name': 'Bob', 'role': 'user'}

# Nested comprehension — normalize scores
raw = {"alice": [85, 90, 78], "bob": [70, 65, 80]}
averages = {name: sum(scores) / len(scores) for name, scores in raw.items()}
print(averages)  # {'alice': 84.33..., 'bob': 71.66...}
```

---

## Merging Dictionaries

Python has evolved multiple ways to merge dicts. Know them all.

```python
defaults = {"color": "blue", "size": "medium", "debug": False}
overrides = {"size": "large", "verbose": True}

# 1. update() — mutates the first dict
result = defaults.copy()
result.update(overrides)
print(result)  # {'color': 'blue', 'size': 'large', 'debug': False, 'verbose': True}

# 2. **unpacking — creates a new dict (Python 3.5+)
result = {**defaults, **overrides}
print(result)  # same as above
# Later dicts win on key conflicts:
print({**{"a": 1}, **{"a": 2}})  # {'a': 2}

# 3. | operator — creates new merged dict (Python 3.9+)
result = defaults | overrides
print(result)

# 4. |= operator — in-place merge (Python 3.9+)
config = {"host": "localhost"}
config |= {"port": 8080, "host": "prod.example.com"}
print(config)  # {'host': 'prod.example.com', 'port': 8080}

# Layered config: defaults < file < env < CLI
def build_config(defaults, file_cfg, env_cfg, cli_cfg):
    return defaults | file_cfg | env_cfg | cli_cfg

final = build_config(
    {"debug": False, "port": 8000, "host": "localhost"},
    {"port": 9000},
    {"host": "staging.example.com"},
    {"debug": True},
)
print(final)
# {'debug': True, 'port': 9000, 'host': 'staging.example.com'}
```

---

## Nested Dictionaries

```python
# Building nested dicts
config = {
    "database": {
        "host": "localhost",
        "port": 5432,
        "credentials": {
            "user": "admin",
            "password": "secret",
        },
    },
    "cache": {
        "backend": "redis",
        "timeout": 300,
    },
}

# Accessing nested values
print(config["database"]["host"])                      # localhost
print(config["database"]["credentials"]["user"])       # admin

# SAFE deep access using get chaining
db_cfg = config.get("database", {})
creds  = db_cfg.get("credentials", {})
user   = creds.get("user", "anonymous")
print(user)  # admin

# Or write a helper
def deep_get(d: dict, *keys, default=None):
    for key in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(key, default)
    return d

print(deep_get(config, "database", "credentials", "password"))  # secret
print(deep_get(config, "database", "replica", "host", default="N/A"))  # N/A

# Building deeply nested dicts with setdefault
tree = {}
path = ["section1", "subsection2", "item3"]
node = tree
for part in path[:-1]:
    node = node.setdefault(part, {})
node[path[-1]] = "value"
print(tree)
# {'section1': {'subsection2': {'item3': 'value'}}}
```

---

## Dict Ordering (Python 3.7+)

Since CPython 3.6 (guaranteed spec in Python 3.7), dicts maintain **insertion order**:

```python
d = {}
d["z"] = 3
d["a"] = 1
d["m"] = 2

# Iteration order is insertion order
for k in d:
    print(k, end=" ")  # z a m

# This makes it safe to rely on order for serialization, display, etc.
# For explicit ordering control, use collections.OrderedDict (rare today)
from collections import OrderedDict
od = OrderedDict()
od["first"]  = 1
od["second"] = 2
od.move_to_end("first")        # move "first" to the end
od.move_to_end("second", last=False)  # move "second" to the front
print(list(od.keys()))  # ['second', 'first']
```

---

## defaultdict and Counter Preview

```python
from collections import defaultdict, Counter

# defaultdict — no KeyError on missing key
# The factory is called with no args to produce the default value
word_lists = defaultdict(list)
for word in ["apple", "banana", "avocado", "blueberry", "cherry"]:
    word_lists[word[0]].append(word)
print(dict(word_lists))
# {'a': ['apple', 'avocado'], 'b': ['banana', 'blueberry'], 'c': ['cherry']}

# defaultdict(int) for counting
counts = defaultdict(int)
for ch in "mississippi":
    counts[ch] += 1   # no need for counts.get(ch, 0) + 1
print(dict(counts))   # {'m': 1, 'i': 4, 's': 4, 'p': 2}

# Counter — specialized dict for counting
text = "the quick brown fox jumps over the lazy dog"
words = text.split()
freq = Counter(words)
print(freq.most_common(3))
# [('the', 2), ('quick', 1), ('brown', 1)]
```

---

## Gotchas

### Mutating a Dict While Iterating

```python
d = {"a": 1, "b": 2, "c": 3, "d": 4}

# BAD — raises RuntimeError: dictionary changed size during iteration
# for k in d:
#     if d[k] % 2 == 0:
#         del d[k]

# GOOD — iterate over a copy of keys
for k in list(d.keys()):
    if d[k] % 2 == 0:
        del d[k]
print(d)  # {'a': 1, 'c': 3}

# BETTER — build a new dict
d = {k: v for k, v in d.items() if v % 2 != 0}
```

### Mutable Default Argument

```python
# CLASSIC Python bug — the default dict is created ONCE and shared
def add_entry_bad(key, value, store={}):
    store[key] = value
    return store

print(add_entry_bad("a", 1))   # {'a': 1}
print(add_entry_bad("b", 2))   # {'a': 1, 'b': 2}  ← state persists!
print(add_entry_bad("c", 3))   # {'a': 1, 'b': 2, 'c': 3}

# CORRECT — use None as sentinel
def add_entry_good(key, value, store=None):
    if store is None:
        store = {}
    store[key] = value
    return store

print(add_entry_good("a", 1))  # {'a': 1}
print(add_entry_good("b", 2))  # {'b': 2}  ← fresh dict each time
```

---

## Key Takeaways

- Dicts maintain **insertion order** since Python 3.7. Rely on this for display and serialization.
- Use `.get(key, default)` instead of `[]` when the key might be absent. Avoids `KeyError`.
- `.setdefault(key, default)` inserts a default only when the key is missing, and returns the value — useful for grouping.
- Iterate with `.items()` to get key-value pairs. Views (`.keys()`, `.values()`, `.items()`) are live and support set operations.
- Merge dicts with `|` (Python 3.9+) or `{**a, **b}` (3.5+). Later dicts win on key conflicts.
- Never mutate a dict while iterating over it. Use `list(d.keys())` or a comprehension to build a new dict.
- The mutable default argument (`def f(d={})`) is one of Python's most common bugs. Always use `None` as the default and create the mutable object inside the function.
- For counting, use `Counter`. For grouping, use `defaultdict(list)`. Both live in `collections`.
