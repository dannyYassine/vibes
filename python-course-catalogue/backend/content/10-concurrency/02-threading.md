---
title: "Threading: Locks, Queues & Thread Safety"
description: "Use Python threads effectively for I/O-bound concurrency with proper synchronization."
duration_minutes: 35
order: 2
---

## Creating and Running Threads

The `threading` module is the standard library's interface for working with OS threads. Every parameter you need for basic thread management is available on `threading.Thread`.

```python
import threading
import time

def worker(name: str, delay: float) -> None:
    print(f"[{name}] starting")
    time.sleep(delay)
    print(f"[{name}] done after {delay}s")

# Basic creation
t = threading.Thread(target=worker, args=("Alice",), kwargs={"delay": 1.5})

print(f"Is alive before start: {t.is_alive()}")  # False
t.start()
print(f"Is alive after start:  {t.is_alive()}")  # True
t.join()  # Block until thread finishes
print(f"Is alive after join:   {t.is_alive()}")  # False
```

Key parameters on `threading.Thread`:

- `target`: the callable to run in the new thread
- `args`: positional arguments as a tuple
- `kwargs`: keyword arguments as a dict
- `name`: human-readable name (defaults to "Thread-N")
- `daemon`: if `True`, thread dies when main thread exits

Useful methods and attributes:

- `.start()` — begin execution (can only be called once)
- `.join(timeout=None)` — wait for thread to finish
- `.is_alive()` — returns `True` if thread is currently running
- `.name` — read/write thread name

## Thread Lifecycle

A thread moves through these states:

```
New (created, not started)
  ↓ .start()
Runnable (ready to run, waiting for OS scheduler)
  ↓ OS schedules it
Running (executing on a CPU core)
  ↓ I/O wait, sleep, or preemption
Blocked (waiting for lock, I/O, or sleep to finish)
  ↓ condition met
Runnable → Running → ...
  ↓ target function returns
Terminated (finished, cannot be restarted)
```

Once a thread reaches Terminated, you cannot call `.start()` again — you would need to create a new `Thread` object.

## Daemon Threads

A **daemon thread** runs in the background and is automatically killed when the main thread exits, regardless of whether the daemon is still running.

```python
import threading
import time

def background_monitor():
    while True:
        print("Monitoring...")
        time.sleep(2)

# Without daemon=True, the program would never exit because
# this thread runs forever.
monitor = threading.Thread(target=background_monitor, daemon=True)
monitor.start()

print("Main thread doing work...")
time.sleep(5)
print("Main thread exiting. Daemon will be killed automatically.")
# Program exits here; background_monitor is terminated mid-sleep if needed
```

Use daemon threads for:
- Background logging or metrics collection
- Heartbeat/keepalive signals
- Cache refresh loops

Do NOT use daemon threads for work that must complete cleanly (e.g., writing to a database, flushing a buffer). Daemon threads are killed abruptly — no cleanup, no finally blocks running.

## Race Conditions: The Problem

When two threads read and write shared data without coordination, the results become unpredictable. This is a **race condition**.

```python
import threading

counter = 0
NUM_INCREMENTS = 100_000

def unsafe_increment():
    global counter
    for _ in range(NUM_INCREMENTS):
        # This looks atomic but is NOT.
        # Python compiles it to: LOAD_GLOBAL counter, BINARY_ADD 1, STORE_GLOBAL counter
        # The GIL can switch between LOAD and STORE, letting another thread see the old value.
        counter += 1

threads = [threading.Thread(target=unsafe_increment) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()

print(f"Expected: {4 * NUM_INCREMENTS:,}")
print(f"Got:      {counter:,}")
# Got: some smaller number, e.g. 287,453 — varies every run
```

The fix is synchronization.

## threading.Lock: The Basic Mutex

A `Lock` allows only one thread at a time to enter a critical section.

```python
import threading

counter = 0
lock = threading.Lock()
NUM_INCREMENTS = 100_000

def safe_increment():
    global counter
    for _ in range(NUM_INCREMENTS):
        with lock:  # acquire on enter, release on exit (even on exception)
            counter += 1

threads = [threading.Thread(target=safe_increment) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()

print(f"Expected: {4 * NUM_INCREMENTS:,}")
print(f"Got:      {counter:,}")  # Always correct: 400,000
```

You can also use `lock.acquire()` and `lock.release()` manually, but the `with` statement is preferred because it guarantees release even if an exception occurs.

```python
# Manual — avoid unless you need the timeout parameter
acquired = lock.acquire(blocking=True, timeout=2.0)
if acquired:
    try:
        # critical section
        counter += 1
    finally:
        lock.release()
else:
    print("Could not acquire lock within 2 seconds")
```

## threading.RLock: Reentrant Lock

A `Lock` will **deadlock** if the same thread tries to acquire it twice. An `RLock` (reentrant lock) allows the same thread to acquire it multiple times, as long as it releases it the same number of times.

```python
import threading

lock = threading.Lock()
rlock = threading.RLock()

def bad_nested():
    with lock:
        print("outer acquired")
        with lock:  # DEADLOCK — trying to acquire a lock this thread already holds
            print("inner acquired")  # Never reached

def good_nested():
    with rlock:
        print("outer acquired")
        with rlock:  # OK — same thread, RLock tracks this
            print("inner acquired")
    # Lock released twice: once for inner, once for outer

t = threading.Thread(target=good_nested)
t.start()
t.join()
```

`RLock` is useful when a method calls another method that also needs the lock, for example in recursive algorithms or class methods that call each other.

## threading.Event: Thread Signaling

An `Event` is a simple flag that lets one thread signal one or more waiting threads.

```python
import threading
import time

ready_event = threading.Event()

def producer():
    print("Producer: preparing data...")
    time.sleep(2)
    print("Producer: data is ready, signaling consumers")
    ready_event.set()  # Set flag to True, wake all waiters

def consumer(name: str):
    print(f"Consumer {name}: waiting for data...")
    ready_event.wait()  # Block until event is set
    print(f"Consumer {name}: got the signal, processing data")

threads = [
    threading.Thread(target=producer),
    threading.Thread(target=consumer, args=("A",)),
    threading.Thread(target=consumer, args=("B",)),
    threading.Thread(target=consumer, args=("C",)),
]
for t in threads: t.start()
for t in threads: t.join()
```

Key methods:
- `.set()` — set the flag to `True`, waking all threads blocked on `.wait()`
- `.clear()` — reset the flag to `False`
- `.wait(timeout=None)` — block until the flag is `True` (or timeout expires)
- `.is_set()` — non-blocking check of the current flag state

## threading.Semaphore: Limiting Concurrent Access

A `Semaphore` allows up to N threads to access a resource concurrently. When N threads are inside, others block until one exits.

```python
import threading
import time
import random

# Allow at most 3 simultaneous "database connections"
db_semaphore = threading.Semaphore(3)

def use_database(thread_id: int):
    print(f"Thread {thread_id}: waiting for DB connection")
    with db_semaphore:
        print(f"Thread {thread_id}: acquired connection")
        time.sleep(random.uniform(0.5, 1.5))  # Simulate query
        print(f"Thread {thread_id}: releasing connection")

threads = [threading.Thread(target=use_database, args=(i,)) for i in range(8)]
for t in threads: t.start()
for t in threads: t.join()
# At most 3 threads will be "inside" the semaphore at any moment
```

Use `BoundedSemaphore` if you want to catch bugs where `.release()` is called more times than `.acquire()` — it raises `ValueError` instead of silently incrementing the counter above the initial value.

## threading.Condition: Producer-Consumer Signaling

A `Condition` is a more powerful coordination primitive that pairs a lock with wait/notify semantics.

```python
import threading
import time
from collections import deque

buffer = deque()
MAX_SIZE = 5
condition = threading.Condition()

def producer():
    for i in range(10):
        with condition:
            while len(buffer) >= MAX_SIZE:
                print("Producer: buffer full, waiting")
                condition.wait()  # Releases lock and blocks; re-acquires on notify
            buffer.append(i)
            print(f"Producer: added {i}, buffer size = {len(buffer)}")
            condition.notify_all()  # Wake waiting consumers
        time.sleep(0.1)

def consumer(name: str):
    consumed = 0
    while consumed < 5:
        with condition:
            while not buffer:
                condition.wait()
            item = buffer.popleft()
            consumed += 1
            print(f"Consumer {name}: got {item}")
            condition.notify_all()  # Wake producer if it was waiting

threads = [
    threading.Thread(target=producer),
    threading.Thread(target=consumer, args=("A",)),
    threading.Thread(target=consumer, args=("B",)),
]
for t in threads: t.start()
for t in threads: t.join()
```

The `while not buffer` / `while len(buffer) >= MAX_SIZE` patterns (instead of `if`) guard against **spurious wakeups** — where a thread is woken without the condition being actually true.

## queue.Queue: The Right Way to Share Data Between Threads

`queue.Queue` is a thread-safe FIFO queue — no locks needed in your code because they're built in.

```python
import threading
import queue
import time

work_queue: queue.Queue[str] = queue.Queue(maxsize=10)
SENTINEL = None  # Signal to tell consumer to stop

def producer(q: queue.Queue, items: list):
    for item in items:
        q.put(item)  # Blocks if queue is full (maxsize reached)
        print(f"Produced: {item}")
    q.put(SENTINEL)  # Signal that production is done

def consumer(q: queue.Queue):
    while True:
        item = q.get()  # Blocks until an item is available
        if item is SENTINEL:
            q.task_done()
            break
        print(f"Consumed: {item}")
        time.sleep(0.05)  # Simulate processing
        q.task_done()  # Signal that this item has been processed

items = [f"task-{i}" for i in range(20)]
q: queue.Queue = queue.Queue(maxsize=5)

p = threading.Thread(target=producer, args=(q, items))
c = threading.Thread(target=consumer, args=(q,))

p.start(); c.start()
q.join()  # Block until all items have been task_done()
p.join(); c.join()
```

Key methods on `queue.Queue`:
- `put(item, block=True, timeout=None)` — add item; blocks if `maxsize` reached
- `get(block=True, timeout=None)` — remove and return item; blocks if empty
- `put_nowait(item)` / `get_nowait()` — non-blocking versions; raise `queue.Full` / `queue.Empty`
- `task_done()` — signal that a previously `get()`-ted item has been processed
- `join()` — block until all items in the queue have had `task_done()` called
- `qsize()` — approximate size (not reliable for logic due to race between check and use)
- `empty()` / `full()` — approximate checks, same caveat

Also available: `queue.LifoQueue` (stack), `queue.PriorityQueue`.

## threading.local(): Per-Thread State

`threading.local()` creates a storage object where each thread has its own isolated copy of attributes.

```python
import threading

thread_local = threading.local()

def process_request(user_id: int):
    # Each thread sets its own 'current_user', no interference
    thread_local.current_user = user_id
    # Simulate work
    import time; time.sleep(0.01)
    print(f"Thread serving user {thread_local.current_user}")

threads = [
    threading.Thread(target=process_request, args=(uid,))
    for uid in range(5)
]
for t in threads: t.start()
for t in threads: t.join()
# Each thread correctly prints its own user_id
```

Common uses: per-thread database connections (e.g., SQLAlchemy sessions), request context in web frameworks, per-thread random number generators.

## Real Example: Parallel HTTP Requests with Threads and Queue

```python
import threading
import queue
import urllib.request
import urllib.error
import json
import time
from typing import NamedTuple

class Result(NamedTuple):
    url: str
    status: int
    elapsed: float

NUM_WORKERS = 5

def fetch_worker(work_q: queue.Queue, result_q: queue.Queue) -> None:
    while True:
        url = work_q.get()
        if url is None:  # Poison pill to stop worker
            work_q.task_done()
            break
        start = time.perf_counter()
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                status = resp.status
        except urllib.error.HTTPError as e:
            status = e.code
        except Exception:
            status = 0
        elapsed = time.perf_counter() - start
        result_q.put(Result(url, status, elapsed))
        work_q.task_done()

def fetch_all_parallel(urls: list[str]) -> list[Result]:
    work_q: queue.Queue = queue.Queue()
    result_q: queue.Queue = queue.Queue()

    # Start worker threads
    workers = []
    for _ in range(NUM_WORKERS):
        t = threading.Thread(target=fetch_worker, args=(work_q, result_q), daemon=True)
        t.start()
        workers.append(t)

    # Enqueue work
    for url in urls:
        work_q.put(url)

    # Enqueue poison pills to stop workers
    for _ in range(NUM_WORKERS):
        work_q.put(None)

    work_q.join()  # Wait until all work is done

    # Collect results
    results = []
    while not result_q.empty():
        results.append(result_q.get_nowait())
    return results

# Usage
urls = [
    "https://httpbin.org/status/200",
    "https://httpbin.org/status/404",
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/1",
    "https://httpbin.org/json",
]

start = time.perf_counter()
results = fetch_all_parallel(urls)
total = time.perf_counter() - start

for r in results:
    print(f"  {r.status}  {r.elapsed:.2f}s  {r.url}")
print(f"\nTotal: {total:.2f}s (vs ~{len(urls)}s sequential)")
```

## Deadlock: What It Is and How to Avoid It

A **deadlock** occurs when two or more threads are each waiting for a lock held by the other.

```python
import threading
import time

lock_a = threading.Lock()
lock_b = threading.Lock()

def thread_one():
    with lock_a:
        print("Thread 1 acquired lock_a")
        time.sleep(0.01)  # Give thread 2 time to acquire lock_b
        print("Thread 1 waiting for lock_b...")
        with lock_b:  # DEADLOCK: Thread 2 holds lock_b, waiting for lock_a
            print("Thread 1 acquired both locks")

def thread_two():
    with lock_b:
        print("Thread 2 acquired lock_b")
        time.sleep(0.01)
        print("Thread 2 waiting for lock_a...")
        with lock_a:  # DEADLOCK: Thread 1 holds lock_a, waiting for lock_b
            print("Thread 2 acquired both locks")

# This program will hang forever
# t1 = threading.Thread(target=thread_one)
# t2 = threading.Thread(target=thread_two)
# t1.start(); t2.start()
# t1.join(); t2.join()
```

**Prevention strategies:**

1. **Lock ordering** — always acquire locks in the same order across all threads:

```python
def safe_thread_one():
    with lock_a:   # Always acquire a before b
        with lock_b:
            print("Thread 1 has both")

def safe_thread_two():
    with lock_a:   # Same order: a before b
        with lock_b:
            print("Thread 2 has both")
```

2. **Timeouts** — use `lock.acquire(timeout=...)` and handle failure:

```python
def with_timeout():
    if lock_a.acquire(timeout=1.0):
        try:
            if lock_b.acquire(timeout=1.0):
                try:
                    print("Got both locks")
                finally:
                    lock_b.release()
            else:
                print("Could not acquire lock_b in time, backing off")
        finally:
            lock_a.release()
```

3. **Use higher-level abstractions** — `queue.Queue` eliminates most locking needs entirely. Design your system so threads communicate through queues instead of sharing mutable state.

## Key Takeaways

- `threading.Thread(target, args, kwargs, daemon)` is the basic building block; use `.start()` and `.join()`.
- Daemon threads are killed when the main thread exits — only use them for tasks that can be interrupted safely.
- **Race conditions** arise when multiple threads access shared mutable state without synchronization.
- `threading.Lock()` with the `with` statement is the safest way to protect a critical section.
- `threading.RLock()` is a reentrant lock for cases where the same thread needs to acquire the lock multiple times.
- `threading.Event` signals between threads (one-shot or repeated flag).
- `threading.Semaphore(n)` limits concurrent access to N threads — useful for connection pools and rate limiting.
- `queue.Queue` is the preferred communication mechanism between threads — it handles all locking internally.
- `threading.local()` gives each thread its own private copy of a variable.
- **Deadlocks** are prevented by consistent lock ordering, timeouts, and preferring message-passing (queues) over shared state.
