---
title: "The collections Module"
description: "Master Counter, defaultdict, OrderedDict, deque, and ChainMap from the collections module."
duration_minutes: 30
order: 1
---

## The collections Module

Python's built-in `list`, `dict`, and `set` cover most needs. But the `collections` module provides specialized containers that solve specific problems more elegantly and efficiently. Reaching for the right tool here often transforms messy, manual code into a few clear lines.

---

## Counter: Counting Made Easy

`Counter` is a dict subclass designed for counting hashable objects. It handles the "count occurrences" pattern that would otherwise require manual `get(key, 0) + 1` gymnastics.

```python
from collections import Counter

# Basic counting
text = "the quick brown fox jumps over the lazy dog"
word_freq = Counter(text.split())
print(word_freq)
# Counter({'the': 2, 'quick': 1, 'brown': 1, ...})

# most_common(n) — top n items sorted by count
print(word_freq.most_common(3))
# [('the', 2), ('quick', 1), ('brown', 1)]

# Access like a dict — returns 0 for missing keys (not KeyError)
print(word_freq["the"])     # 2
print(word_freq["python"])  # 0  (not KeyError!)

# Count characters
char_freq = Counter("mississippi")
print(char_freq)
# Counter({'i': 4, 's': 4, 'p': 2, 'm': 1})
print(char_freq.most_common(2))
# [('i', 4), ('s', 4)]

# Increment/update with another iterable
votes = Counter()
votes.update(["alice", "bob", "alice", "carol", "alice", "bob"])
print(votes)
# Counter({'alice': 3, 'bob': 2, 'carol': 1})

# Direct construction from a dict
inventory = Counter({"apples": 5, "oranges": 3, "bananas": 10})
```

### Counter Arithmetic

```python
from collections import Counter

# Two counters representing inventory at two warehouses
warehouse_a = Counter({"apples": 30, "bananas": 20, "grapes": 5})
warehouse_b = Counter({"apples": 10, "bananas": 35, "mangoes": 8})

# + union (sum of counts)
total = warehouse_a + warehouse_b
print(total)
# Counter({'bananas': 55, 'apples': 40, 'mangoes': 8, 'grapes': 5})

# - difference (only positive results kept)
after_sale = warehouse_a - Counter({"apples": 25, "bananas": 30})
print(after_sale)
# Counter({'apples': 5, 'grapes': 5})

# & intersection (minimum of counts)
common = warehouse_a & warehouse_b
print(common)
# Counter({'bananas': 20, 'apples': 10})

# | union (maximum of counts)
combined = warehouse_a | warehouse_b
print(combined)
# Counter({'bananas': 35, 'apples': 30, 'mangoes': 8, 'grapes': 5})

# Real use: find the top 5 most common words in a corpus
import re

def top_words(text: str, n: int = 5) -> list[tuple[str, int]]:
    words = re.findall(r"\b[a-z]+\b", text.lower())
    return Counter(words).most_common(n)

corpus = """
Python is a versatile programming language. Python is used in web development,
data science, machine learning, and automation. Python's simplicity makes
Python popular among beginners and experts alike.
"""
print(top_words(corpus, 5))
# [('python', 4), ('is', 2), ('a', 1), ('versatile', 1), ('programming', 1)]
```

---

## defaultdict: No More KeyError on Missing Keys

`defaultdict(factory)` calls `factory()` with no arguments to produce a default value whenever a missing key is accessed. It eliminates the common `setdefault` / `get(k, default)` pattern.

```python
from collections import defaultdict

# defaultdict(list) — groups items by key
animals_by_letter = defaultdict(list)
animals = ["aardvark", "albatross", "bear", "buffalo", "cat", "crane", "dog"]
for animal in animals:
    animals_by_letter[animal[0]].append(animal)

print(dict(animals_by_letter))
# {'a': ['aardvark', 'albatross'], 'b': ['bear', 'buffalo'],
#  'c': ['cat', 'crane'], 'd': ['dog']}

# Compare to the manual approach:
manual = {}
for animal in animals:
    if animal[0] not in manual:
        manual[animal[0]] = []
    manual[animal[0]].append(animal)  # defaultdict is clearly cleaner


# defaultdict(int) — counting without get(k, 0)
word_count = defaultdict(int)
for word in "to be or not to be".split():
    word_count[word] += 1
print(dict(word_count))
# {'to': 2, 'be': 2, 'or': 1, 'not': 1}


# defaultdict(set) — grouping unique values
tags_by_post = defaultdict(set)
post_tags = [
    (1, "python"), (1, "backend"), (2, "python"),
    (2, "ml"), (3, "backend"), (1, "python"),  # duplicate
]
for post_id, tag in post_tags:
    tags_by_post[post_id].add(tag)
print(dict(tags_by_post))
# {1: {'python', 'backend'}, 2: {'python', 'ml'}, 3: {'backend'}}


# Nested dicts with defaultdict(dict)
# Building an adjacency list for a graph
graph = defaultdict(dict)
edges = [("A", "B", 1.0), ("A", "C", 2.5), ("B", "C", 1.5)]
for src, dst, weight in edges:
    graph[src][dst] = weight
    graph[dst][src] = weight   # undirected

print(dict(graph))
# {'A': {'B': 1.0, 'C': 2.5}, 'B': {'A': 1.0, 'C': 1.5}, 'C': {'A': 2.5, 'B': 1.5}}


# Deeply nested with defaultdict recursion
def nested_defaultdict():
    return defaultdict(nested_defaultdict)

tree = nested_defaultdict()
tree["countries"]["germany"]["cities"]["berlin"]["population"] = 3_600_000
print(tree["countries"]["germany"]["cities"]["berlin"]["population"])  # 3600000
```

---

## OrderedDict: Beyond Insertion Order

Since Python 3.7, regular dicts preserve insertion order. `OrderedDict` still has unique features that plain dict lacks: `move_to_end()` and equality that considers order.

```python
from collections import OrderedDict

# Regular dict vs OrderedDict equality
d1 = {"a": 1, "b": 2}
d2 = {"b": 2, "a": 1}
print(d1 == d2)   # True — dicts ignore order in equality

od1 = OrderedDict([("a", 1), ("b", 2)])
od2 = OrderedDict([("b", 2), ("a", 1)])
print(od1 == od2)  # False — OrderedDict respects order

# move_to_end()
od = OrderedDict([("first", 1), ("second", 2), ("third", 3)])
od.move_to_end("first")          # move to end (last=True default)
print(list(od.keys()))   # ['second', 'third', 'first']

od.move_to_end("first", last=False)  # move to start
print(list(od.keys()))   # ['first', 'second', 'third']

# reversed() — OrderedDict supports reversed iteration
for k in reversed(od):
    print(k, end=" ")    # third second first
print()


# LRU Cache using OrderedDict
class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self._cache = OrderedDict()

    def get(self, key: str):
        if key not in self._cache:
            return None
        self._cache.move_to_end(key)   # mark as recently used
        return self._cache[key]

    def put(self, key: str, value) -> None:
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = value
        if len(self._cache) > self.capacity:
            self._cache.popitem(last=False)  # remove least recently used (first item)

    def __repr__(self) -> str:
        return f"LRUCache({dict(self._cache)})"

cache = LRUCache(capacity=3)
cache.put("a", 1)
cache.put("b", 2)
cache.put("c", 3)
print(cache)   # LRUCache({'a': 1, 'b': 2, 'c': 3})

cache.get("a")   # access 'a' — moves to end
cache.put("d", 4)  # capacity exceeded — evicts 'b' (least recently used)
print(cache)   # LRUCache({'c': 3, 'a': 1, 'd': 4})
```

---

## deque: O(1) at Both Ends

A `list` provides O(1) `append` and `pop` at the right end, but O(n) `insert(0, x)` and `pop(0)` at the left end because it must shift all elements. `deque` (double-ended queue) provides O(1) operations at **both** ends.

```python
from collections import deque
import time

# Performance comparison: left-side operations
n = 100_000

start = time.perf_counter()
lst = []
for i in range(n):
    lst.insert(0, i)   # O(n) each time!
list_time = time.perf_counter() - start

start = time.perf_counter()
dq = deque()
for i in range(n):
    dq.appendleft(i)   # O(1) each time
deque_time = time.perf_counter() - start

print(f"list.insert(0): {list_time:.3f}s")
print(f"deque.appendleft: {deque_time:.4f}s")
print(f"Speedup: {list_time / deque_time:.0f}x")
# Speedup: ~200-500x for left-side insertion


# deque API
dq = deque([1, 2, 3, 4, 5])

dq.append(6)          # add right:  [1, 2, 3, 4, 5, 6]
dq.appendleft(0)      # add left:   [0, 1, 2, 3, 4, 5, 6]
dq.pop()              # remove right → 6; dq = [0, 1, 2, 3, 4, 5]
dq.popleft()          # remove left  → 0; dq = [1, 2, 3, 4, 5]

dq.extend([6, 7])        # extend right
dq.extendleft([-1, -2])  # extend left (each element prepended one by one!)
print(dq)   # deque([-2, -1, 1, 2, 3, 4, 5, 6, 7])

# rotate(n) — rotate n steps to the right (negative = left)
dq = deque([1, 2, 3, 4, 5])
dq.rotate(2)
print(dq)   # deque([4, 5, 1, 2, 3])
dq.rotate(-2)
print(dq)   # deque([1, 2, 3, 4, 5])  (restored)


# maxlen — bounded buffer (older items are automatically discarded)
recent_errors = deque(maxlen=5)
for i in range(10):
    recent_errors.append(f"Error #{i}")
print(recent_errors)
# deque(['Error #5', 'Error #6', 'Error #7', 'Error #8', 'Error #9'], maxlen=5)


# BFS queue — deque is the canonical choice
def bfs(graph: dict, start: str) -> list[str]:
    visited = set()
    queue = deque([start])
    order = []
    while queue:
        node = queue.popleft()   # O(1) — this is why we use deque, not list
        if node in visited:
            continue
        visited.add(node)
        order.append(node)
        queue.extend(graph.get(node, []))
    return order

graph = {"A": ["B", "C"], "B": ["D"], "C": ["D", "E"], "D": [], "E": []}
print(bfs(graph, "A"))   # ['A', 'B', 'C', 'D', 'E']


# Sliding window — last N items
def moving_average(data: list[float], window: int) -> list[float]:
    buf = deque(maxlen=window)
    averages = []
    for value in data:
        buf.append(value)
        if len(buf) == window:
            averages.append(sum(buf) / window)
    return averages

prices = [10, 12, 11, 13, 15, 14, 16, 18, 17, 20]
print(moving_average(prices, window=3))
# [11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.33...]
```

---

## ChainMap: Layered Configuration

`ChainMap` groups multiple mappings into a single view. Lookups search each mapping in order, stopping at the first match. Updates and insertions affect only the first mapping.

```python
from collections import ChainMap

# Layered configuration: defaults < config file < environment < CLI
defaults  = {"host": "localhost", "port": 8080, "debug": False, "workers": 4}
file_cfg  = {"port": 9000, "workers": 8}
env_cfg   = {"host": "staging.example.com"}
cli_args  = {"debug": True}

config = ChainMap(cli_args, env_cfg, file_cfg, defaults)

print(config["host"])     # staging.example.com  (from env_cfg)
print(config["port"])     # 9000  (from file_cfg)
print(config["debug"])    # True  (from cli_args)
print(config["workers"])  # 8     (from file_cfg)

# Iteration sees all unique keys (from all maps)
print(set(config.keys()))
# {'host', 'port', 'debug', 'workers'}

# Updates only affect the FIRST map (cli_args)
config["host"] = "prod.example.com"
print(cli_args)   # {'debug': True, 'host': 'prod.example.com'}
print(env_cfg)    # {'host': 'staging.example.com'}  — unchanged

# .maps — access the list of underlying mappings
print(config.maps)

# new_child() — push a new empty map on top
child = config.new_child({"timeout": 30})
print(child["timeout"])    # 30  (new layer)
print(child["host"])       # prod.example.com  (from parent chain)

# ChainMap for scoped variable lookup (like Python's scope resolution)
builtins   = {"len": len, "print": print, "range": range}
globals_   = {"my_var": 42}
locals_    = {"x": 10}

scope = ChainMap(locals_, globals_, builtins)
print(scope["x"])       # 10  (local)
print(scope["my_var"])  # 42  (global)
print(scope["len"])     # <built-in function len>
```

---

## namedtuple: Lightweight Immutable Records

`namedtuple` creates a tuple subclass with named fields. It is lighter than a full class while giving you readable attribute access and all tuple properties (iterable, hashable, unpackable).

```python
from collections import namedtuple

# Define a namedtuple type
Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)

# Attribute access
print(p.x, p.y)    # 3 4

# Index access — still a tuple
print(p[0], p[1])  # 3 4

# Unpackable
x, y = p
print(x, y)    # 3 4

# Readable repr
print(p)       # Point(x=3, y=4)

# Hashable — usable as dict key
distances = {Point(0, 0): 0, Point(3, 4): 5}
print(distances[Point(3, 4)])   # 5

# Iterable
print(list(p))   # [3, 4]

# _make() — create from any iterable
raw = (10, 20)
p2 = Point._make(raw)
print(p2)   # Point(x=10, y=20)

# _asdict() — convert to an OrderedDict
print(p._asdict())   # {'x': 3, 'y': 4}

# _replace() — create modified copy (like dataclasses.replace)
p3 = p._replace(x=100)
print(p3)   # Point(x=100, y=4)
print(p)    # Point(x=3, y=4)  — original unchanged

# _fields — field names as a tuple
print(Point._fields)   # ('x', 'y')


# Defaults (Python 3.6.1+)
Employee = namedtuple("Employee", ["name", "department", "salary"], defaults=[None, 50000])
e1 = Employee("Alice", "Engineering")
print(e1)   # Employee(name='Alice', department='Engineering', salary=50000)

e2 = Employee("Bob")
print(e2)   # Employee(name='Bob', department=None, salary=50000)


# Real use: structured CSV row parsing
import csv
from io import StringIO

csv_data = """name,age,department
Alice,30,Engineering
Bob,25,Marketing
Carol,35,Engineering"""

Record = namedtuple("Record", ["name", "age", "department"])
reader = csv.DictReader(StringIO(csv_data))
records = [Record(**row) for row in reader]

for r in records:
    print(f"{r.name} ({r.age}) — {r.department}")
# Alice (30) — Engineering
# Bob (25) — Marketing
# Carol (35) — Engineering


# namedtuple vs dataclass
# namedtuple: tuple subclass — iterable, unpackable, hashable, immutable
# dataclass:  regular class — methods, validation, mutable, inheritance
# Use namedtuple when you want tuple semantics;
# use dataclass when you want class semantics.
```

---

## Key Takeaways

- **`Counter`** counts hashable items, returns 0 for missing keys, and supports set-like arithmetic (`+`, `-`, `&`, `|`). Use it for frequency analysis and top-N queries.
- **`defaultdict(factory)`** calls `factory()` to produce default values, eliminating `KeyError` on missing keys. `defaultdict(list)` for grouping and `defaultdict(int)` for counting are the two most common patterns.
- **`OrderedDict`** is mostly superseded by regular dict for insertion-order needs, but `move_to_end()` and order-sensitive equality make it uniquely useful for LRU caches.
- **`deque`** provides O(1) `appendleft`/`popleft`. Use it as a BFS queue, a sliding-window buffer, or any structure that needs efficient left-side operations. Use `maxlen` for bounded buffers.
- **`ChainMap`** chains multiple dicts into a single lookup view without copying. Perfect for layered configuration (defaults → file → env → CLI).
- **`namedtuple`** creates lightweight immutable records that behave like tuples but have named fields. Use `_make()`, `_asdict()`, and `_replace()` for common operations.
- Import from `collections`, not from individual sub-modules: `from collections import Counter, defaultdict, deque, OrderedDict, ChainMap, namedtuple`.
