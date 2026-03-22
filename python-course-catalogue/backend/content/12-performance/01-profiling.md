---
title: "Profiling Python: cProfile, line_profiler, timeit"
description: "Measure what's slow before optimizing using Python's profiling tools."
duration_minutes: 30
order: 1
---

## The Golden Rule: Measure First

Donald Knuth said it best: "Premature optimization is the root of all evil." Before touching a single line of code to make it faster, you need data. Without measurement, you are guessing — and programmers are notoriously bad at guessing where the bottleneck actually is.

The workflow is always:
1. Write correct, readable code first
2. Identify that a performance problem exists (user complaint, SLA breach, timeout)
3. Profile to find the actual bottleneck (the "hot path")
4. Optimize only that part
5. Measure again to confirm improvement
6. Repeat if necessary

Optimizing code that isn't a bottleneck wastes your time, adds complexity, and often introduces bugs.

---

## timeit: Benchmarking Small Code Snippets

`timeit` is built into Python's standard library and is designed for microbenchmarks — timing small, isolated pieces of code.

### Using timeit in Code

```python
import timeit

# Time a string concatenation approach using a generator expression
result = timeit.timeit(
    '"-".join(str(n) for n in range(100))',
    number=10000
)
print(f"Generator join: {result:.4f}s for 10,000 iterations")

# Compare against a list comprehension approach
result2 = timeit.timeit(
    '"-".join([str(n) for n in range(100)])',
    number=10000
)
print(f"List comp join: {result2:.4f}s for 10,000 iterations")

# Output (approximate):
# Generator join: 0.1123s for 10,000 iterations
# List comp join: 0.0891s for 10,000 iterations
# List comprehension wins here because join() needs to iterate twice with a generator
```

### timeit.repeat() for Statistical Accuracy

Running a benchmark once can give misleading results due to OS scheduling noise, GC pauses, or CPU frequency scaling. `repeat()` runs the benchmark multiple times and returns a list of times.

```python
import timeit

setup = "data = list(range(1000))"

# Run 5 trials of 1000 iterations each
times = timeit.repeat(
    "sum(data)",
    setup=setup,
    repeat=5,
    number=1000
)

print(f"Times: {[f'{t:.4f}' for t in times]}")
print(f"Best:  {min(times):.4f}s")
print(f"Worst: {max(times):.4f}s")
print(f"Mean:  {sum(times)/len(times):.4f}s")

# Always report the minimum — it represents the best-case execution
# without interference from OS noise. The Python docs recommend min().
```

### Using timeit from the Command Line

The `-m timeit` flag is convenient for quick comparisons in your terminal:

```bash
# Concatenation with + operator
python -m timeit '"+" .join(str(n) for n in range(100))'

# With setup code using -s
python -m timeit -s "data = list(range(1000))" "sum(data)"

# Increase iterations for more stable results
python -m timeit -n 100000 "x = 1 + 1"
```

### Pitfalls with timeit

```python
# Pitfall 1: The loop variable can affect results
# timeit disables garbage collection by default — sometimes you want it enabled
timeit.timeit("x = []", number=1000000)  # GC is off; large allocations may not be collected

# Pitfall 2: Don't put too much setup inside the timed section
# BAD: includes list creation in the timing
timeit.timeit("[x**2 for x in range(1000)]", number=10000)

# BETTER: if you want to time only the list comprehension logic with real data
timeit.timeit("[x**2 for x in data]", setup="data = list(range(1000))", number=10000)
```

---

## cProfile: Profiling Entire Programs

`timeit` is for isolated snippets. When you want to understand the performance of a whole program or function call graph — including which functions are called, how many times, and how long they take — use `cProfile`.

### Profiling a Script from the Command Line

```bash
# Profile a script, sorted by cumulative time
python -m cProfile -s cumulative my_script.py

# Save the output to a file for later analysis
python -m cProfile -o output.prof my_script.py
```

### Understanding the Output Columns

```
ncalls  tottime  percall  cumtime  percall filename:lineno(function)
```

| Column | Meaning |
|---|---|
| `ncalls` | Number of times the function was called |
| `tottime` | Total time spent in this function, **excluding** time in sub-calls |
| `percall` | `tottime / ncalls` |
| `cumtime` | Total time spent in this function **including** sub-calls |
| `percall` | `cumtime / ncalls` |
| `filename:lineno` | Where the function is defined |

**Focus on `cumtime`** to find the overall most expensive call chains. Use `tottime` to find functions that are themselves slow (not just calling slow things).

### Profiling in Code

```python
import cProfile
import pstats

def slow_function():
    total = 0
    for i in range(100_000):
        total += sum(range(i % 100))
    return total

def fast_lookup():
    data = {i: i**2 for i in range(1000)}
    return [data[i % 1000] for i in range(100_000)]

def main():
    slow_function()
    fast_lookup()

# Method 1: cProfile.run() — simplest
cProfile.run('main()', sort='cumulative')

# Method 2: Profile object for more control
profiler = cProfile.Profile()
profiler.enable()
main()
profiler.disable()

# Print stats using pstats
stats = pstats.Stats(profiler)
stats.strip_dirs()           # Remove long file paths
stats.sort_stats('cumulative')
stats.print_stats(15)        # Show top 15 functions
```

---

## pstats: Analyzing Saved Profiles

```python
import pstats

# Load a .prof file saved with -o flag
stats = pstats.Stats('output.prof')

# Strip directory paths for cleaner output
stats.strip_dirs()

# Sort options: 'cumulative', 'tottime', 'calls', 'filename', 'pcalls'
stats.sort_stats('cumulative')

# Print top 20 entries
stats.print_stats(20)

# Filter to only show your own code (exclude stdlib)
stats.print_stats('mymodule')

# Show which functions called a specific function
stats.print_callers('slow_function')

# Show what a specific function calls
stats.print_callees('main')
```

---

## snakeviz: Interactive Flame Graph Visualization

Reading text output from `cProfile` gets tedious for large programs. `snakeviz` renders a `.prof` file as an interactive sunburst chart or icicle chart in your browser.

```bash
pip install snakeviz

# First generate the profile file
python -m cProfile -o output.prof my_script.py

# Then open the interactive visualization
snakeviz output.prof
```

The visualization shows:
- Each function as a block, with width proportional to cumulative time
- Nested calls shown as concentric rings (sunburst) or nested rectangles (icicle)
- Click any block to zoom into that subtree
- Hover for exact stats

This is the recommended way to explore profiles on non-trivial programs.

---

## line_profiler: Finding the Exact Slow Line

`cProfile` tells you which function is slow. `line_profiler` tells you which line inside that function is slow.

```bash
pip install line-profiler
```

Decorate the functions you want to profile with `@profile` (the decorator is injected by `kernprof`, not imported):

```python
# slow_analysis.py

@profile
def process_records(records):
    results = []
    for record in records:
        # Is this line slow?
        cleaned = record.strip().lower()
        # Or this one?
        parts = cleaned.split(',')
        # Or this?
        value = float(parts[2]) * 1.15
        results.append(value)
    return results

@profile
def load_data(filename):
    with open(filename) as f:
        return f.readlines()

if __name__ == '__main__':
    data = load_data('big_file.csv')
    process_records(data)
```

Run with kernprof:

```bash
# -l: use line_profiler, -v: print results immediately
kernprof -l -v slow_analysis.py
```

Output:
```
Line #    Hits       Time   Per Hit   % Time  Line Contents
============================================================
     4                                         @profile
     5                                         def process_records(records):
     6         1       12.0     12.0      0.0    results = []
     7    100001    45231.0      0.5      8.1    for record in records:
     8    100000    89432.0      0.9     16.1      cleaned = record.strip().lower()
     9    100000    67891.0      0.7     12.2      parts = cleaned.split(',')
    10    100000   312456.0      3.1     56.2      value = float(parts[2]) * 1.15
    11    100000    41234.0      0.4      7.4      results.append(value)
```

Line 10 (`float()` conversion) is consuming 56% of the time — that's where to focus.

---

## memory_profiler: Tracking Memory Usage

```bash
pip install memory-profiler
```

```python
# memory_example.py
from memory_profiler import profile

@profile
def load_large_dataset():
    # Line-by-line memory tracking
    data = []
    for i in range(100_000):
        data.append({'id': i, 'value': i * 2.5, 'label': f'item_{i}'})
    return data

if __name__ == '__main__':
    load_large_dataset()
```

```bash
python -m memory_profiler memory_example.py

# Or use mprof for time-based memory profiling
mprof run memory_example.py
mprof plot  # Opens a matplotlib chart of memory over time
```

---

## tracemalloc: Built-in Memory Tracing

`tracemalloc` is in the standard library (Python 3.4+) and can find where allocations come from.

```python
import tracemalloc

# Start tracing
tracemalloc.start()

# ... run the code you want to profile ...
data = [i**2 for i in range(100_000)]
more_data = {str(i): i for i in range(50_000)}

# Take a snapshot
snapshot = tracemalloc.take_snapshot()

# Show top memory consumers by file/line
top_stats = snapshot.statistics('lineno')
print("Top 5 memory allocations:")
for stat in top_stats[:5]:
    print(stat)

# Compare two snapshots to see what grew
snapshot1 = tracemalloc.take_snapshot()
# ... do more work ...
snapshot2 = tracemalloc.take_snapshot()
top_stats = snapshot2.compare_to(snapshot1, 'lineno')
for stat in top_stats[:5]:
    print(stat)
```

---

## py-spy: Sampling Profiler for Production

`py-spy` is a sampling profiler written in Rust. It attaches to a running Python process without any code changes or restarts — invaluable for diagnosing production slowdowns.

```bash
pip install py-spy

# Show a live top-like view of the running process
py-spy top --pid 12345

# Record a flame graph (output as SVG)
py-spy record -o profile.svg --pid 12345

# Profile a script from the start
py-spy record -o profile.svg -- python my_script.py
```

Key advantages:
- Zero code changes — attaches to any running Python process
- Negligible overhead (sampling, not instrumentation)
- Works on production servers
- Generates interactive SVG flame graphs

---

## Real-World Profiling Example

Here is a realistic workflow: you have a data processing function that takes too long.

```python
# data_processor.py
import csv
import re
import cProfile
import pstats

def normalize_email(email):
    # Compiling regex on every call is slow!
    pattern = re.compile(r'\s+')
    return re.sub(pattern, '', email.lower().strip())

def calculate_score(values):
    # Unnecessary list creation
    squared = [v**2 for v in values]
    return sum(squared) / len(squared)

def process_users(filepath):
    results = []
    with open(filepath) as f:
        reader = csv.DictReader(f)
        for row in reader:
            email = normalize_email(row['email'])
            scores = [float(x) for x in row['scores'].split(';')]
            avg = calculate_score(scores)
            results.append({'email': email, 'score': avg})
    return results

# Profile it
if __name__ == '__main__':
    profiler = cProfile.Profile()
    profiler.enable()
    process_users('users.csv')
    profiler.disable()

    stats = pstats.Stats(profiler)
    stats.strip_dirs()
    stats.sort_stats('cumulative')
    stats.print_stats(10)
```

After profiling, the output reveals `normalize_email` is called thousands of times and `re.compile` shows up in the top functions. The fix:

```python
# Compile once at module level
EMAIL_WHITESPACE = re.compile(r'\s+')

def normalize_email(email):
    return EMAIL_WHITESPACE.sub('', email.lower().strip())

# Also replace list comprehension in calculate_score with a generator
def calculate_score(values):
    total = sum(v**2 for v in values)
    return total / len(values)
```

Run the profile again to confirm the improvement. The `re.compile` call disappears from the top of the stats.

---

## Profiling Workflow Summary

```
1. Get a reproducible test case (input that triggers the slowness)
2. python -m cProfile -o output.prof script.py
3. snakeviz output.prof  (identify the hot function)
4. Add @profile to that function, run: kernprof -l -v script.py
5. Find the slow line
6. Fix it
7. Run cProfile again — verify cumtime improved
8. Check correctness with your test suite
```

---

## Key Takeaways

- **Never optimize without profiling first.** Your intuition about where the bottleneck is will be wrong more often than not.
- **`timeit`** is for comparing two small code snippets head-to-head. Always use `repeat()` and take the minimum.
- **`cProfile`** gives you a function-level call graph. Sort by `cumtime` to find expensive chains. Use `snakeviz` to visualize the profile file.
- **`line_profiler`** narrows it down to the exact line. Run with `kernprof -l -v`.
- **`memory_profiler`** and **`tracemalloc`** track memory allocations per line and per snapshot.
- **`py-spy`** is for production — attach to a live process without code changes.
- The profiling loop is: **measure → identify → fix → verify**. Don't stop after fixing once; re-profile to confirm you solved the right problem.
