---
title: "Multiprocessing: Pools, Pipes & Shared Memory"
description: "Bypass the GIL with multiprocessing for true CPU-bound parallelism."
duration_minutes: 35
order: 3
---

## Why Multiprocessing?

Python threads cannot achieve true CPU parallelism due to the GIL. **Multiprocessing** solves this by spawning separate OS processes — each with its own Python interpreter, its own GIL, and its own memory space. True parallel execution across CPU cores.

```
Main Process
├── GIL (own)
├── Memory space (own)
└── Spawns:
    ├── Worker Process 1 — own GIL, own memory, runs on Core 1
    ├── Worker Process 2 — own GIL, own memory, runs on Core 2
    └── Worker Process 3 — own GIL, own memory, runs on Core 3
```

The trade-off: no shared memory by default (data must be serialized/deserialized to move between processes), and higher startup overhead than threads.

## multiprocessing.Process: Spawning a Single Process

```python
import multiprocessing
import os
import time

def worker(name: str, duration: float) -> None:
    print(f"[{name}] PID={os.getpid()}, Parent PID={os.getppid()}")
    # Simulate CPU-bound work
    total = sum(i * i for i in range(1_000_000))
    time.sleep(duration)
    print(f"[{name}] done, result={total}")

if __name__ == "__main__":
    p = multiprocessing.Process(
        target=worker,
        args=("worker-1",),
        kwargs={"duration": 0.5},
        name="MyWorker",
    )

    print(f"Main PID: {os.getpid()}")
    p.start()
    print(f"Worker PID: {p.pid}")
    print(f"Is alive: {p.is_alive()}")  # True
    p.join(timeout=5)  # Wait up to 5 seconds
    print(f"Exit code: {p.exitcode}")  # 0 on success
```

Key attributes and methods:
- `.start()` — fork/spawn the process
- `.join(timeout)` — wait for the process to finish
- `.is_alive()` — check if running
- `.pid` — OS process ID (set after `.start()`)
- `.exitcode` — return code (None if still running, 0 if clean exit, negative if killed by signal)
- `.terminate()` — send SIGTERM (Unix) or TerminateProcess (Windows)
- `.kill()` — send SIGKILL (Unix only, immediate)

## The `if __name__ == "__main__"` Guard

On **Windows and macOS** (which use the `spawn` start method), the child process imports the main module to get the target function. Without the guard, the import itself would trigger new process creation, causing infinite recursion.

```python
# BAD — will cause RuntimeError on Windows/macOS
import multiprocessing

def worker():
    print("working")

p = multiprocessing.Process(target=worker)
p.start()  # On Windows: imports this file → starts another process → imports again → ...
p.join()
```

```python
# GOOD — always use this guard
import multiprocessing

def worker():
    print("working")

if __name__ == "__main__":
    p = multiprocessing.Process(target=worker)
    p.start()
    p.join()
```

This guard is also required when using `multiprocessing.Pool`.

## Process Pools: Distributing Work

Creating one process per task is expensive. `multiprocessing.Pool` maintains a fixed number of worker processes and distributes tasks among them.

```python
import multiprocessing
import time

def compute_square(n: int) -> int:
    """CPU-bound operation."""
    return sum(i * i for i in range(n))

if __name__ == "__main__":
    numbers = [500_000, 600_000, 700_000, 800_000, 900_000, 1_000_000]

    # pool.map: blocks until all results are ready, returns list in input order
    with multiprocessing.Pool(processes=4) as pool:
        start = time.perf_counter()
        results = pool.map(compute_square, numbers)
        elapsed = time.perf_counter() - start

    print(f"Results: {results[:3]}...")
    print(f"Time: {elapsed:.2f}s")
```

### pool.map vs pool.starmap vs pool.imap

```python
import multiprocessing

def add(x: int, y: int) -> int:
    return x + y

if __name__ == "__main__":
    with multiprocessing.Pool(4) as pool:

        # map: single argument per call
        squares = pool.map(lambda x: x**2, range(10))

        # starmap: multiple arguments — unpacks each tuple as *args
        pairs = [(1, 2), (3, 4), (5, 6)]
        sums = pool.starmap(add, pairs)
        print(sums)  # [3, 7, 11]

        # imap: lazy iterator, doesn't load all results into memory at once
        # results come back in INPUT order
        for result in pool.imap(lambda x: x**2, range(1_000_000), chunksize=1000):
            pass  # process one at a time, memory efficient

        # imap_unordered: like imap but returns results AS THEY COMPLETE
        # faster if you don't need ordering
        for result in pool.imap_unordered(lambda x: x**2, range(100), chunksize=10):
            pass
```

### chunksize for Performance

When using `pool.map` or `pool.imap` with many small items, the default `chunksize=1` means one IPC round-trip per item — very slow. Increase `chunksize` to batch items:

```python
if __name__ == "__main__":
    data = list(range(1_000_000))
    with multiprocessing.Pool(4) as pool:
        # Bad: 1,000,000 IPC calls
        # results = pool.map(str, data, chunksize=1)

        # Good: 1,000 IPC calls (each sends 1,000 items)
        results = pool.map(str, data, chunksize=1000)
```

Rule of thumb: `chunksize = len(data) // (pool_size * 4)` is a reasonable starting point.

## Inter-Process Communication: Pipe

A `Pipe` creates a pair of connected endpoints. Each process writes to one end and reads from the other.

```python
import multiprocessing

def producer(conn):
    for i in range(5):
        conn.send({"id": i, "data": f"item-{i}"})
        print(f"Sent item {i}")
    conn.send(None)  # Sentinel to signal end
    conn.close()

def consumer(conn):
    while True:
        msg = conn.recv()  # Blocks until data is available
        if msg is None:
            break
        print(f"Received: {msg}")
    conn.close()

if __name__ == "__main__":
    parent_conn, child_conn = multiprocessing.Pipe(duplex=True)
    # duplex=True (default): both ends can send and receive
    # duplex=False: parent_conn is read-only, child_conn is write-only

    p = multiprocessing.Process(target=producer, args=(child_conn,))
    c = multiprocessing.Process(target=consumer, args=(parent_conn,))

    c.start(); p.start()
    p.join(); c.join()
```

Important: `conn.recv()` uses `pickle` to deserialize data. Only picklable objects can be sent. Large objects are expensive to pickle/unpickle.

## multiprocessing.Queue: Process-Safe Queue

Similar to `queue.Queue` but works across process boundaries:

```python
import multiprocessing
import time
import os

def worker(task_queue: multiprocessing.Queue, result_queue: multiprocessing.Queue):
    while True:
        task = task_queue.get()
        if task is None:  # Poison pill
            break
        result = task ** 2
        result_queue.put({"pid": os.getpid(), "input": task, "output": result})
        time.sleep(0.01)

if __name__ == "__main__":
    task_q: multiprocessing.Queue = multiprocessing.Queue()
    result_q: multiprocessing.Queue = multiprocessing.Queue()

    # Start 4 workers
    workers = []
    for _ in range(4):
        p = multiprocessing.Process(target=worker, args=(task_q, result_q))
        p.start()
        workers.append(p)

    # Submit tasks
    for i in range(20):
        task_q.put(i)

    # Send poison pills
    for _ in range(4):
        task_q.put(None)

    # Wait for workers
    for p in workers:
        p.join()

    # Collect results
    results = []
    while not result_q.empty():
        results.append(result_q.get())

    print(f"Got {len(results)} results")
    print(results[:3])
```

## Shared Memory: Value and Array

When processes need to share mutable state, use `multiprocessing.Value` and `multiprocessing.Array` for low-level shared memory:

```python
import multiprocessing
import ctypes
import time

def increment_shared(shared_counter, lock, n: int):
    for _ in range(n):
        with lock:  # Shared memory requires explicit locking
            shared_counter.value += 1

if __name__ == "__main__":
    # Value: single value of a ctypes type
    counter = multiprocessing.Value(ctypes.c_int, 0)
    lock = multiprocessing.Lock()

    processes = [
        multiprocessing.Process(target=increment_shared, args=(counter, lock, 50_000))
        for _ in range(4)
    ]
    for p in processes: p.start()
    for p in processes: p.join()

    print(f"Counter: {counter.value}")  # Should be 200,000

    # Array: fixed-size array of a ctypes type
    shared_array = multiprocessing.Array(ctypes.c_double, [0.0] * 10)
    print(f"Array: {list(shared_array)}")
```

WARNING: forgetting to lock shared memory writes causes the same race conditions as threading. The lock must be a `multiprocessing.Lock`, not a `threading.Lock` (which doesn't work across processes).

## multiprocessing.Manager: Managed Objects

For more flexible shared data structures, use a `Manager`, which runs a separate server process that all workers communicate with:

```python
import multiprocessing

def worker_with_manager(shared_dict: dict, shared_list: list, key: str, value: int):
    shared_dict[key] = value
    shared_list.append(value)

if __name__ == "__main__":
    with multiprocessing.Manager() as manager:
        shared_dict = manager.dict()   # Proxy to dict in manager process
        shared_list = manager.list()  # Proxy to list in manager process

        processes = [
            multiprocessing.Process(
                target=worker_with_manager,
                args=(shared_dict, shared_list, f"key-{i}", i)
            )
            for i in range(5)
        ]
        for p in processes: p.start()
        for p in processes: p.join()

        print(dict(shared_dict))  # {'key-0': 0, 'key-1': 1, ...}
        print(list(shared_list))
```

Manager objects are **slower** than `Value`/`Array` because every operation requires IPC to the manager process. Use them when you need dict/list semantics rather than raw numeric arrays.

## Start Methods: fork, spawn, forkserver

How a new process is created depends on the **start method**:

| Method | Platform | How it works | Memory |
|---|---|---|---|
| `fork` | Unix (Linux default) | Copies parent process image | Inherits all parent memory (copy-on-write) |
| `spawn` | Windows default, macOS default since 3.8 | Fresh Python interpreter, imports `__main__` | Clean slate, slower startup |
| `forkserver` | Unix only | A server forks new processes on request | Clean state (server was forked once) |

```python
import multiprocessing

# Check current start method
print(multiprocessing.get_start_method())  # 'fork' on Linux, 'spawn' on macOS

# Change it (must be done before creating any processes)
if __name__ == "__main__":
    multiprocessing.set_start_method("spawn")  # Forces spawn even on Linux
```

`fork` is fast but can cause subtle bugs when the parent has open file handles, threads, or locks at fork time (the child inherits them in a potentially inconsistent state). `spawn` is safe but slower.

## Real Example: Parallel File Hashing

```python
import multiprocessing
import hashlib
import os
import time
from pathlib import Path

def hash_file(filepath: str) -> dict:
    """Compute SHA-256 of a file. This is CPU-bound."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return {"path": filepath, "hash": sha256.hexdigest(), "size": os.path.getsize(filepath)}

def hash_files_sequential(filepaths: list[str]) -> list[dict]:
    return [hash_file(p) for p in filepaths]

def hash_files_parallel(filepaths: list[str], workers: int = None) -> list[dict]:
    workers = workers or os.cpu_count()
    with multiprocessing.Pool(processes=workers) as pool:
        return pool.map(hash_file, filepaths)

if __name__ == "__main__":
    # Find some files to hash (use your own paths)
    files = [str(p) for p in Path("/usr/lib").glob("*.dylib")][:20]
    if not files:
        # Fallback: create some temp files
        import tempfile
        files = []
        for i in range(20):
            f = tempfile.NamedTemporaryFile(delete=False)
            f.write(os.urandom(1024 * 1024))  # 1MB of random data
            f.close()
            files.append(f.name)

    # Sequential
    start = time.perf_counter()
    seq_results = hash_files_sequential(files)
    seq_time = time.perf_counter() - start

    # Parallel
    start = time.perf_counter()
    par_results = hash_files_parallel(files)
    par_time = time.perf_counter() - start

    print(f"Files:       {len(files)}")
    print(f"Sequential:  {seq_time:.3f}s")
    print(f"Parallel:    {par_time:.3f}s")
    print(f"Speedup:     {seq_time / par_time:.1f}x")
```

## Threading vs Multiprocessing: When to Use Each

| Criterion | threading | multiprocessing |
|---|---|---|
| Workload | I/O-bound | CPU-bound (pure Python) |
| Shared state | Easy (shared memory) | Hard (IPC required) |
| Memory overhead | Low (shared memory) | High (copy per process) |
| Startup cost | ~0.1ms | ~10-100ms |
| GIL bypass | No | Yes |
| Communication | Direct + queue.Queue | Queue, Pipe, Value, Array |
| Error isolation | Low (crash affects all) | High (isolated processes) |
| Best for | HTTP requests, DB queries, file I/O | Image processing, hashing, ML training |

## Key Takeaways

- `multiprocessing.Process` creates a child process with its own Python interpreter and GIL — enabling true CPU parallelism.
- Always guard process spawning code with `if __name__ == "__main__"` — required for `spawn` and `forkserver` start methods (Windows, macOS).
- `multiprocessing.Pool` is the workhouse for CPU-bound parallelism: `pool.map()` for simple cases, `pool.imap_unordered()` for streaming results, tune `chunksize` for performance.
- IPC options: `Pipe` (fast, two-endpoint), `Queue` (multi-producer/consumer, slower), `Value`/`Array` (raw shared memory, fastest).
- Shared `Value`/`Array` requires an explicit `multiprocessing.Lock` — same race conditions as threading apply.
- `Manager()` provides dict/list/Namespace proxies at the cost of IPC overhead.
- `fork` is fast but can inherit parent state issues; `spawn` is clean but slower — macOS and Windows default to `spawn`.
- Use threading for I/O-bound work (lower overhead, easier shared state); use multiprocessing for CPU-bound pure Python work.
