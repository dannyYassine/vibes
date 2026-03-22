---
title: "__slots__ and Memory Optimization"
description: "Reduce memory usage and speed up attribute access with __slots__."
duration_minutes: 25
order: 7
---

## __slots__ and Memory Optimization

For most Python objects, memory usage is not something you need to think about. But when you create **millions of instances** — coordinates in a physics simulation, events in a log processor, rows from a database — the overhead of Python's default attribute storage can become significant. `__slots__` eliminates that overhead.

---

## Python's Default __dict__: Where the Overhead Lives

By default, every Python instance stores its attributes in a dictionary called `__dict__`. A dictionary has significant baseline memory overhead — even an empty dict takes around 200 bytes on a 64-bit CPython interpreter.

```python
import sys

class PointDict:
    """Default class — uses __dict__ for attribute storage."""
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

p = PointDict(1.0, 2.0)

# The object itself
print(sys.getsizeof(p))          # ~48 bytes (just the object header)

# But every instance also has a __dict__
print(sys.getsizeof(p.__dict__)) # ~232 bytes (the attribute dictionary)

# Total effective cost per instance: ~280 bytes
print(hasattr(p, "__dict__"))    # True

# You can dynamically add any attribute to a default-dict object
p.z = 3.0        # perfectly fine
p.label = "origin nearby"
print(p.__dict__)
# {'x': 1.0, 'y': 2.0, 'z': 3.0, 'label': 'origin nearby'}
```

---

## __slots__: Eliminating the Per-Instance __dict__

`__slots__` is a class variable that declares a fixed set of attributes. Python replaces the per-instance `__dict__` with a compact array of slot descriptors.

```python
class PointSlot:
    """Uses __slots__ — no per-instance __dict__."""
    __slots__ = ("x", "y")

    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

ps = PointSlot(1.0, 2.0)

print(sys.getsizeof(ps))          # ~56 bytes
print(hasattr(ps, "__dict__"))    # False — no __dict__!

# Cannot add arbitrary attributes
try:
    ps.z = 3.0
except AttributeError as e:
    print(e)   # 'PointSlot' object has no attribute 'z'

# But declared slots work perfectly
ps.x = 10.0
print(ps.x)    # 10.0
```

---

## Memory Demo: Quantifying the Savings

Let us create a million instances of each and measure real memory use.

```python
import sys
import tracemalloc

class EventDict:
    def __init__(self, ts: float, source: str, level: str, message: str):
        self.ts = ts
        self.source = source
        self.level = level
        self.message = message

class EventSlot:
    __slots__ = ("ts", "source", "level", "message")

    def __init__(self, ts: float, source: str, level: str, message: str):
        self.ts = ts
        self.source = source
        self.level = level
        self.message = message

N = 500_000

# Measure EventDict
tracemalloc.start()
events_dict = [EventDict(float(i), "server1", "INFO", "heartbeat") for i in range(N)]
_, dict_peak = tracemalloc.get_traced_memory()
tracemalloc.stop()

# Measure EventSlot
tracemalloc.start()
events_slot = [EventSlot(float(i), "server1", "INFO", "heartbeat") for i in range(N)]
_, slot_peak = tracemalloc.get_traced_memory()
tracemalloc.stop()

print(f"EventDict peak: {dict_peak / 1_048_576:.1f} MB")
print(f"EventSlot peak: {slot_peak / 1_048_576:.1f} MB")
print(f"Savings: {(1 - slot_peak/dict_peak)*100:.0f}%")

# Typical output:
# EventDict peak: 189.3 MB
# EventSlot peak:  62.1 MB
# Savings: 67%

# Per-instance size comparison
d = EventDict(0, "s", "I", "m")
s = EventSlot(0, "s", "I", "m")
print(f"Per-instance (dict): ~{sys.getsizeof(d) + sys.getsizeof(d.__dict__)} bytes")
print(f"Per-instance (slot): ~{sys.getsizeof(s)} bytes")
```

---

## Performance: Faster Attribute Access

Slot access uses a **slot descriptor** — a C-level function that directly reads from a fixed offset in the object's memory layout, bypassing the dictionary hash lookup.

```python
import timeit

class WithDict:
    def __init__(self, x, y):
        self.x = x
        self.y = y

class WithSlots:
    __slots__ = ("x", "y")
    def __init__(self, x, y):
        self.x = x
        self.y = y

d = WithDict(1.0, 2.0)
s = WithSlots(1.0, 2.0)

dict_time = timeit.timeit(lambda: d.x + d.y, number=5_000_000)
slot_time = timeit.timeit(lambda: s.x + s.y, number=5_000_000)

print(f"Dict access: {dict_time:.3f}s")
print(f"Slot access: {slot_time:.3f}s")
print(f"Speedup:    {dict_time / slot_time:.2f}x")
# Typical: Slot access is ~1.2-1.5x faster than dict access
```

The difference is modest for a handful of accesses in a loop, but it adds up significantly in inner loops processing millions of objects.

---

## Slots with Inheritance

The memory savings only fully apply when **every class in the MRO** defines `__slots__`. If a parent class does not define `__slots__`, it has a `__dict__`, and the child inherits it.

```python
# Case 1: Full slots across the hierarchy
class Base:
    __slots__ = ("id",)
    def __init__(self, id: int):
        self.id = id

class Child(Base):
    __slots__ = ("name",)   # only NEW slots here; id inherited from Base
    def __init__(self, id: int, name: str):
        super().__init__(id)
        self.name = name

c = Child(1, "Alice")
print(sys.getsizeof(c))         # compact
print(hasattr(c, "__dict__"))   # False — fully slotted

# Case 2: Base without __slots__ — Child gets __dict__ anyway
class BaseNoSlots:
    def __init__(self, id: int):
        self.id = id

class ChildWithSlots(BaseNoSlots):
    __slots__ = ("name",)
    def __init__(self, id: int, name: str):
        super().__init__(id)
        self.name = name

c2 = ChildWithSlots(1, "Bob")
print(hasattr(c2, "__dict__"))   # True! — inherited from BaseNoSlots
c2.extra = "surprise"            # dynamic attrs still work via __dict__
```

**Rule**: For full benefit, every class in the inheritance chain must define `__slots__`. If any ancestor lacks `__slots__`, the `__dict__` is inherited and memory savings are partial.

---

## __weakref__ in __slots__

By default, instances can be weakly referenced. When you use `__slots__`, the `__weakref__` slot is also removed. If your code (or a library you use) needs weak references to your object, you must explicitly include `__weakref__`:

```python
import weakref

class Tracked:
    __slots__ = ("x", "__weakref__")  # include __weakref__!
    def __init__(self, x):
        self.x = x

t = Tracked(42)
ref = weakref.ref(t)
print(ref())    # <__main__.Tracked object at 0x...>

class NotTracked:
    __slots__ = ("x",)   # no __weakref__
    def __init__(self, x):
        self.x = x

try:
    ref2 = weakref.ref(NotTracked(1))
except TypeError as e:
    print(e)   # cannot create weak reference to 'NotTracked' object
```

---

## When NOT to Use __slots__

`__slots__` is a trade-off. Avoid it when:

```python
# 1. You need dynamic attributes
class FlexibleConfig:
    # __slots__ would break this pattern:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)  # AttributeError with slots!

# 2. Multiple inheritance from non-slotted classes
# Python supports multiple inheritance, but __slots__ interaction can be complex.
# If any base has __dict__, you lose the memory benefit anyway.

# 3. Pickling complications
# Slots work with pickle, but only if __getstate__/__setstate__ are defined
# or if the class doesn't need custom state management.
import pickle

class Serializable:
    __slots__ = ("x", "y")
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __getstate__(self):
        return {"x": self.x, "y": self.y}

    def __setstate__(self, state):
        self.x = state["x"]
        self.y = state["y"]

s = Serializable(1, 2)
blob = pickle.dumps(s)
s2 = pickle.loads(blob)
print(s2.x, s2.y)   # 1 2

# 4. Frameworks that inspect __dict__ (some ORMs, serializers)
# Check your framework's docs before adding __slots__ to model classes.
```

---

## Python 3.10+ Dataclasses: @dataclass(slots=True)

The easiest way to get `__slots__` benefits without writing them manually:

```python
from dataclasses import dataclass
import sys

@dataclass
class Point:
    x: float
    y: float
    z: float = 0.0

@dataclass(slots=True)
class PointSlotted:
    x: float
    y: float
    z: float = 0.0

p1 = Point(1.0, 2.0, 3.0)
p2 = PointSlotted(1.0, 2.0, 3.0)

print(sys.getsizeof(p1))            # includes __dict__ overhead
print(sys.getsizeof(p2))            # compact, no __dict__
print(hasattr(p1, "__dict__"))      # True
print(hasattr(p2, "__dict__"))      # False

# All dataclass features still work
from dataclasses import asdict, replace
print(asdict(p2))                           # {'x': 1.0, 'y': 2.0, 'z': 3.0}
print(replace(p2, z=10.0))                  # PointSlotted(x=1.0, y=2.0, z=10.0)
print(p1 == p2)                             # True
```

Note: `@dataclass(slots=True)` requires Python 3.10+. In earlier versions, you must define `__slots__` manually.

---

## Real Use Case: A Point or Event Class with Millions of Instances

Here is a realistic example from a physics simulation that processes coordinate data:

```python
import sys
import time
import tracemalloc
import math
import random
from dataclasses import dataclass

# Without slots — naive approach
@dataclass
class Particle:
    x: float
    y: float
    vx: float
    vy: float
    mass: float = 1.0

# With slots — production approach
@dataclass(slots=True)
class ParticleSlotted:
    x: float
    y: float
    vx: float
    vy: float
    mass: float = 1.0

def simulate_step(particles, dt: float = 0.01) -> None:
    """Update particle positions based on velocity."""
    for p in particles:
        p.x += p.vx * dt
        p.y += p.vy * dt

N = 200_000

# Benchmark: creation
def create_particles(cls, n: int):
    return [
        cls(
            x=random.uniform(-100, 100),
            y=random.uniform(-100, 100),
            vx=random.gauss(0, 1),
            vy=random.gauss(0, 1),
        )
        for _ in range(n)
    ]

# Memory comparison
tracemalloc.start()
particles_dict = create_particles(Particle, N)
_, dict_mem = tracemalloc.get_traced_memory()
tracemalloc.stop()

tracemalloc.start()
particles_slot = create_particles(ParticleSlotted, N)
_, slot_mem = tracemalloc.get_traced_memory()
tracemalloc.stop()

print(f"Without slots: {dict_mem / 1_048_576:.1f} MB for {N:,} particles")
print(f"With slots:    {slot_mem / 1_048_576:.1f} MB for {N:,} particles")

# Speed comparison
start = time.perf_counter()
for _ in range(10):
    simulate_step(particles_dict)
dict_time = time.perf_counter() - start

start = time.perf_counter()
for _ in range(10):
    simulate_step(particles_slot)
slot_time = time.perf_counter() - start

print(f"10 simulation steps (dict): {dict_time:.3f}s")
print(f"10 simulation steps (slot): {slot_time:.3f}s")
print(f"Simulation speedup: {dict_time / slot_time:.2f}x")
```

---

## Quick Decision Guide

```
Creating many instances? (> ~10,000)
    Yes → Consider __slots__
    No  → Probably not worth the complexity

Need dynamic attributes?
    Yes → Do NOT use __slots__
    No  → __slots__ is safe

Using Python 3.10+ with dataclasses?
    Yes → Use @dataclass(slots=True) — easiest option
    No  → Define __slots__ manually, be careful with inheritance

Using a framework (Django ORM, SQLAlchemy, Pydantic)?
    Check docs first — many frameworks inspect __dict__
    Pydantic v2 uses __slots__ internally already
```

---

## Key Takeaways

- Every normal Python instance carries a `__dict__` that costs roughly 200+ bytes. With millions of instances, this adds up to hundreds of MB of overhead.
- `__slots__` replaces the per-instance `__dict__` with a compact fixed-size descriptor array, saving 50-70% memory and providing modest (~1.3x) attribute access speedup.
- **Every class in the MRO must define `__slots__`** for full benefit. A single parent without `__slots__` reintroduces `__dict__`.
- Include `"__weakref__"` in `__slots__` if the instances need to be weakly referenced.
- Do NOT use `__slots__` when you need dynamic attributes, when mixing with multi-inheritance hierarchies that have `__dict__`, or when your framework inspects `__dict__`.
- The easiest path in Python 3.10+: `@dataclass(slots=True)` — get all the dataclass conveniences and all the `__slots__` benefits in one line.
- Use `tracemalloc` to measure actual memory impact before and after adding `__slots__` in your specific workload.
