---
title: "NumPy Fundamentals for Performance"
description: "Use NumPy arrays for vectorized computation that outperforms pure Python by orders of magnitude."
duration_minutes: 35
order: 4
---

## Why NumPy?

Python lists are flexible and easy to use, but they are slow for numerical computation. Each element in a Python list is a full Python object — a boxed float or int with a type tag, reference count, and memory indirection. For a list of 1 million floats, Python allocates 1 million separate objects scattered across the heap.

NumPy arrays store data in contiguous blocks of typed memory, identical to C arrays. A NumPy array of 1 million float64 values occupies exactly 8 MB in a single allocation. Operations on NumPy arrays are implemented in C (and often BLAS/LAPACK for linear algebra), bypassing the Python interpreter loop entirely.

The result: NumPy operations are typically **10–100x faster** than equivalent pure Python loops, and for matrix operations they can be **1000x faster** when BLAS routines kick in.

```bash
pip install numpy
```

```python
import numpy as np  # 'np' is the universal convention
```

---

## Creating Arrays

### From Python Sequences

```python
import numpy as np

# 1D array from a list
a = np.array([1, 2, 3, 4, 5])
print(a)        # [1 2 3 4 5]
print(type(a))  # <class 'numpy.ndarray'>

# 2D array from nested lists (matrix)
matrix = np.array([[1, 2, 3],
                   [4, 5, 6],
                   [7, 8, 9]])
print(matrix.shape)  # (3, 3)

# Specify dtype explicitly
floats = np.array([1, 2, 3], dtype=np.float64)
ints = np.array([1.7, 2.9, 3.1], dtype=np.int32)  # Truncates, doesn't round
print(ints)  # [1 2 3]
```

### Factory Functions

```python
# Zeros and ones
zeros = np.zeros(5)                # [0. 0. 0. 0. 0.]  (float64 by default)
zeros_int = np.zeros(5, dtype=int) # [0 0 0 0 0]
ones = np.ones((3, 4))             # 3x4 matrix of 1.0
full = np.full((2, 3), 7)          # 2x3 matrix of 7

# Range-like
arange = np.arange(0, 10, 2)           # [0 2 4 6 8]  (like range, but returns array)
linspace = np.linspace(0, 1, 5)        # [0.   0.25 0.5  0.75 1.  ] — 5 evenly spaced points
logspace = np.logspace(0, 3, 4)        # [   1.  10. 100. 1000.] — logarithmic spacing

# Identity matrix
eye = np.eye(3)   # 3x3 identity matrix (1s on diagonal)

# Uninitialized (fast but contains garbage values — use carefully)
empty = np.empty((100, 100))
```

### Random Arrays

```python
rng = np.random.default_rng(seed=42)  # Modern, reproducible random generator

uniform = rng.random((3, 3))           # Uniform [0, 1)
normal  = rng.standard_normal((3, 3)) # Standard normal (mean=0, std=1)
ints    = rng.integers(0, 10, size=5) # Random ints in [0, 10)

# Legacy API (still common in older code)
np.random.rand(3, 3)      # Uniform [0, 1)
np.random.randn(3, 3)     # Standard normal
np.random.randint(0, 10, size=(3, 3))
```

---

## dtypes: The Type of Every Element

Every NumPy array has a single dtype that determines what type every element is, how much memory it uses, and what precision computations have.

```python
import numpy as np

# Common dtypes
np.int8    # 8-bit integer:  -128 to 127
np.int16   # 16-bit integer: -32768 to 32767
np.int32   # 32-bit integer
np.int64   # 64-bit integer (Python default int)
np.float32 # 32-bit float (single precision — half the memory of float64)
np.float64 # 64-bit float (Python default float)
np.bool_   # Boolean (True/False)
np.complex128  # Complex number

a = np.array([1, 2, 3])
print(a.dtype)  # int64 (on 64-bit systems)

b = np.array([1.0, 2.0, 3.0])
print(b.dtype)  # float64

# Memory implications
a32 = np.zeros(1_000_000, dtype=np.float32)
a64 = np.zeros(1_000_000, dtype=np.float64)
print(f"float32: {a32.nbytes:,} bytes")   # 4,000,000 bytes
print(f"float64: {a64.nbytes:,} bytes")   # 8,000,000 bytes

# Converting dtypes
a_float = a.astype(np.float32)
```

---

## Array Attributes

```python
a = np.array([[1, 2, 3], [4, 5, 6]])

print(a.shape)   # (2, 3) — 2 rows, 3 columns
print(a.ndim)    # 2 — number of dimensions
print(a.dtype)   # int64
print(a.size)    # 6 — total number of elements
print(a.nbytes)  # 48 — total bytes (6 elements × 8 bytes each)
```

---

## Element-Wise Operations: No Loops Needed

The defining feature of NumPy is vectorization — arithmetic operators work on entire arrays without writing a loop.

```python
a = np.array([1, 2, 3, 4, 5])
b = np.array([10, 20, 30, 40, 50])

# Element-wise arithmetic — all produce new arrays
print(a + b)    # [11 22 33 44 55]
print(a * b)    # [ 10  40  90 160 250]
print(b / a)    # [10. 10. 10. 10. 10.]
print(a ** 2)   # [ 1  4  9 16 25]
print(b - a)    # [ 9 18 27 36 45]

# Scalar operations broadcast to every element
print(a * 3)    # [ 3  6  9 12 15]
print(a + 100)  # [101 102 103 104 105]

# Speed comparison
import timeit
n = 1_000_000
py_list = list(range(n))
np_arr  = np.arange(n, dtype=np.float64)

t1 = timeit.timeit(lambda: [x * 2 for x in py_list], number=10)
t2 = timeit.timeit(lambda: np_arr * 2, number=10)
print(f"Python loop: {t1:.3f}s")
print(f"NumPy:       {t2:.3f}s")
print(f"Speedup: {t1/t2:.1f}x")
# Typical: 30-80x speedup
```

---

## Broadcasting: Operations on Different Shapes

Broadcasting is the mechanism by which NumPy performs operations on arrays of different but compatible shapes. Instead of requiring all arrays to have exactly the same shape, NumPy "stretches" smaller arrays to match larger ones — conceptually, without actually copying data.

### Broadcasting Rules

Two dimensions are compatible when:
1. They are equal, OR
2. One of them is 1

NumPy compares trailing dimensions first:

```python
# Scalar broadcast (trivial case)
a = np.array([1, 2, 3])
print(a + 10)  # [11 12 13] — 10 broadcast to shape (3,)

# 1D array + 2D array
row = np.array([1, 2, 3])        # shape (3,)
matrix = np.ones((4, 3))         # shape (4, 3)
print(matrix + row)              # shape (4, 3) — row added to each of 4 rows

# Column vector broadcast across columns
col = np.array([[10], [20], [30], [40]])  # shape (4, 1)
print(matrix + col)                       # shape (4, 3)

# Real use case: normalize each row of a matrix (subtract row mean)
data = np.random.rand(100, 5)     # 100 samples, 5 features
row_means = data.mean(axis=1, keepdims=True)  # shape (100, 1)
normalized = data - row_means     # broadcasts (100, 1) to (100, 5)
```

### When Broadcasting Fails

```python
a = np.array([[1, 2], [3, 4]])   # shape (2, 2)
b = np.array([1, 2, 3])          # shape (3,)
# a + b → ValueError: operands could not be broadcast together with shapes (2,2) (3,)
# Trailing dimensions: 2 vs 3 — neither is 1, so incompatible
```

---

## Indexing and Slicing

### Basic Indexing

```python
a = np.array([10, 20, 30, 40, 50])

print(a[0])    # 10  (first element)
print(a[-1])   # 50  (last element)
print(a[1:4])  # [20 30 40]  (slice)
print(a[::2])  # [10 30 50]  (every other element)
print(a[::-1]) # [50 40 30 20 10]  (reversed)

# 2D indexing
m = np.arange(12).reshape(3, 4)
print(m[1, 2])    # 6 — row 1, column 2
print(m[0, :])    # [0 1 2 3] — first row
print(m[:, 2])    # [2 6 10] — third column (all rows)
print(m[1:, 1:3]) # submatrix rows 1-2, cols 1-2
```

### Views vs Copies

An important NumPy gotcha: slices return **views**, not copies. Modifying the slice modifies the original array.

```python
a = np.arange(10)
view = a[2:5]
view[0] = 999
print(a)  # [ 0  1 999  3  4  5  6  7  8  9] — original was modified!

# Force a copy when you need independence
copy = a[2:5].copy()
copy[0] = 0
print(a)  # Unchanged
```

---

## Boolean Indexing (Masking)

```python
a = np.array([3, -1, 4, -1, 5, -9, 2, 6])

# Boolean mask — True where condition is met
mask = a > 0
print(mask)  # [ True False  True False  True False  True  True]

# Index with the mask — returns only matching elements
print(a[mask])   # [3 4 5 2 6]
print(a[a > 0])  # Same, inline

# Combine conditions with & (and), | (or), ~ (not)
# IMPORTANT: use & and |, not 'and' and 'or'
print(a[(a > 0) & (a < 5)])   # [3 4 2]
print(a[(a < 0) | (a > 4)])   # [-1 -1 5 -9  6]
print(a[~(a > 0)])            # [-1 -1 -9]

# Modify values in-place using a mask
a[a < 0] = 0  # Clip negatives to zero
print(a)  # [3 0 4 0 5 0 2 6]

# Real use: filter outliers
data = np.random.standard_normal(1000)
clean = data[np.abs(data) < 3.0]  # Remove values more than 3 std devs from mean
```

---

## Fancy Indexing

```python
a = np.array([10, 20, 30, 40, 50, 60])

# Index with an array of indices
idx = np.array([0, 2, 5])
print(a[idx])  # [10 30 60]

# Reorder a matrix's rows
matrix = np.arange(12).reshape(4, 3)
row_order = [3, 0, 2, 1]  # New row order
print(matrix[row_order])  # Rows reordered

# Use case: shuffle rows of a dataset
indices = np.random.permutation(len(matrix))
shuffled = matrix[indices]
```

---

## Array Methods and Aggregations

```python
a = np.array([[1, 2, 3],
              [4, 5, 6],
              [7, 8, 9]], dtype=float)

# Scalar aggregations
print(a.sum())    # 45.0
print(a.mean())   # 5.0
print(a.std())    # 2.581...
print(a.min())    # 1.0
print(a.max())    # 9.0

# Index of min/max
print(a.argmin()) # 0 (flattened index)
print(a.argmax()) # 8

# The axis parameter: which axis to reduce along
# axis=0: collapse rows (result has same number of columns)
print(a.sum(axis=0))   # [12. 15. 18.] — column sums
print(a.mean(axis=0))  # [4.  5.  6.] — column means

# axis=1: collapse columns (result has same number of rows)
print(a.sum(axis=1))   # [ 6. 15. 24.] — row sums
print(a.mean(axis=1))  # [2. 5. 8.] — row means

# keepdims=True: preserve dimensions for broadcasting
print(a.sum(axis=1, keepdims=True))  # Shape (3,1) instead of (3,)

# Cumulative operations
print(np.cumsum([1, 2, 3, 4]))   # [ 1  3  6 10]
print(np.cumprod([1, 2, 3, 4]))  # [ 1  2  6 24]

# Sorting
a_1d = np.array([3, 1, 4, 1, 5, 9, 2, 6])
print(np.sort(a_1d))          # Returns sorted copy
a_1d.sort()                   # In-place sort
print(np.argsort(a_1d))       # Indices that would sort the array
```

---

## Reshaping

```python
a = np.arange(12)

reshaped = a.reshape(3, 4)   # 3 rows, 4 columns
print(reshaped.shape)        # (3, 4)

# -1 means "infer this dimension"
b = a.reshape(4, -1)         # 4 rows, columns inferred → (4, 3)
c = a.reshape(-1, 6)         # Rows inferred, 6 columns → (2, 6)

# Flatten: always returns a copy
flat = reshaped.flatten()    # 1D copy

# Ravel: returns a view when possible (faster)
flat_view = reshaped.ravel() # 1D view (no copy)

# Transpose: flip rows and columns
m = np.arange(6).reshape(2, 3)
print(m.T)            # shape (3, 2)
print(m.T.shape)      # (3, 2)

# Add dimensions (useful for broadcasting)
v = np.array([1, 2, 3])      # shape (3,)
col_v = v[:, np.newaxis]     # shape (3, 1) — column vector
row_v = v[np.newaxis, :]     # shape (1, 3) — row vector
```

---

## Stacking Arrays

```python
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

# Vertical stack (add rows)
print(np.vstack([a, b]))
# [[1 2 3]
#  [4 5 6]]

# Horizontal stack (add columns)
print(np.hstack([a, b]))  # [1 2 3 4 5 6]

# Stack along new axis
print(np.stack([a, b], axis=0))   # [[1 2 3], [4 5 6]]  shape (2,3)
print(np.stack([a, b], axis=1))   # [[1 4], [2 5], [3 6]]  shape (3,2)

# General concatenate
print(np.concatenate([a, b]))     # [1 2 3 4 5 6]

m1 = np.ones((2, 3))
m2 = np.zeros((2, 3))
print(np.concatenate([m1, m2], axis=0))  # Stack vertically: (4, 3)
print(np.concatenate([m1, m2], axis=1))  # Stack horizontally: (2, 6)
```

---

## Universal Functions (ufuncs)

NumPy's ufuncs are vectorized C functions that operate element-wise. They are much faster than Python loops calling `math.sqrt` etc.

```python
a = np.array([1.0, 4.0, 9.0, 16.0, 25.0])

print(np.sqrt(a))    # [1. 2. 3. 4. 5.]
print(np.exp(a))     # [e^1, e^4, e^9, ...]
print(np.log(a))     # Natural log
print(np.log2(a))    # Log base 2
print(np.log10(a))   # Log base 10
print(np.abs(np.array([-1, -2, 3])))  # [1 2 3]
print(np.sin(np.linspace(0, np.pi, 5)))

# Comparison ufuncs — return boolean arrays
print(np.maximum(a, np.array([2, 2, 2, 2, 2])))  # Element-wise max

# where: conditional element selection
x = np.array([-3, -1, 0, 2, 5])
result = np.where(x >= 0, x, 0)  # Clip negatives to 0
print(result)  # [0 0 0 2 5]

# where with two arrays
positive = np.where(x >= 0, x, -x)  # Absolute value
print(positive)  # [3 1 0 2 5]
```

---

## Performance Demo: Pure Python vs NumPy

```python
import numpy as np
import timeit

n = 1_000_000

# Pure Python sum
py_data = list(range(n))
t_py = timeit.timeit(lambda: sum(py_data), number=50)

# NumPy sum
np_data = np.arange(n, dtype=np.float64)
t_np = timeit.timeit(lambda: np_data.sum(), number=50)

print(f"Python sum: {t_py:.3f}s")
print(f"NumPy sum:  {t_np:.3f}s")
print(f"Speedup:    {t_py/t_np:.1f}x")
# Typical: 10-30x speedup

# For matrix multiplication — the gap is even larger
import time

n = 1000
A = np.random.rand(n, n)
B = np.random.rand(n, n)

# NumPy matrix multiply (uses BLAS — highly optimized multi-threaded C)
start = time.perf_counter()
C = A @ B  # or np.dot(A, B)
numpy_time = time.perf_counter() - start
print(f"NumPy matmul {n}x{n}: {numpy_time*1000:.1f}ms")

# Pure Python equivalent would take many minutes
```

---

## Real Example 1: Normalizing Image Pixel Values

```python
import numpy as np

# Simulated grayscale image: pixels in range [0, 255]
image = np.random.randint(0, 256, size=(1080, 1920), dtype=np.uint8)

# Normalize to [0, 1] float range — single vectorized operation
normalized = image.astype(np.float32) / 255.0
print(f"Min: {normalized.min():.3f}, Max: {normalized.max():.3f}")

# Apply gamma correction: pixel^(1/2.2)
gamma_corrected = np.power(normalized, 1.0 / 2.2)

# Convert back to uint8
output = (gamma_corrected * 255).astype(np.uint8)
print(output.shape, output.dtype)  # (1080, 1920) uint8

# This processes 2 million pixels in milliseconds
```

---

## Real Example 2: Computing a Correlation Matrix

```python
import numpy as np

# 500 observations of 10 variables
data = np.random.randn(500, 10)

# Manual correlation: (X - mean) / std, then X.T @ X / (n-1)
data_centered = data - data.mean(axis=0)
data_normalized = data_centered / data_centered.std(axis=0)
correlation_matrix = (data_normalized.T @ data_normalized) / (len(data) - 1)

# Or use the built-in
correlation_matrix = np.corrcoef(data.T)
print(correlation_matrix.shape)  # (10, 10)

# Find strongly correlated pairs (|r| > 0.5, excluding diagonal)
rows, cols = np.where((np.abs(correlation_matrix) > 0.5) & (np.eye(10) == 0))
for r, c in zip(rows, cols):
    if r < c:  # avoid duplicates
        print(f"Variables {r} and {c}: r = {correlation_matrix[r, c]:.3f}")
```

---

## Key Takeaways

- **NumPy arrays store contiguous typed memory**, unlike Python lists. This enables C-speed operations on millions of elements.
- **Vectorization eliminates Python loops.** `a * 2` on an ndarray is 30-80x faster than `[x * 2 for x in a]` for large n.
- **Use `np.arange()` for integer ranges, `np.linspace()` for evenly spaced floats, `np.zeros()`/`np.ones()` for initialized arrays.**
- **Choose dtypes intentionally.** `float32` uses half the memory of `float64` — important for large datasets. `int8` vs `int64` is an 8x difference.
- **Broadcasting** allows operations on different-shaped arrays without loops or explicit copies. Learn the rules: trailing dims must match or be 1.
- **Boolean indexing** (`a[a > 0]`) is the idiomatic way to filter array elements. Combine conditions with `&` and `|` (not `and`/`or`).
- **Slices return views, not copies.** Modifying a slice modifies the original array. Use `.copy()` when you need independence.
- **Ufuncs** (`np.sqrt`, `np.exp`, `np.sin`) run at C speed on entire arrays. Always prefer them over calling `math.sqrt` in a loop.
- **The `axis` parameter** is fundamental: `axis=0` aggregates across rows (per column), `axis=1` aggregates across columns (per row).
- NumPy is the foundation of the scientific Python ecosystem: pandas, scikit-learn, TensorFlow, and PyTorch all build on NumPy arrays.
