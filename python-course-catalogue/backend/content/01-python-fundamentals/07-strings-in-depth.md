---
title: "Strings In Depth"
description: "Master Python string manipulation, formatting, encoding, and the rich str API."
duration_minutes: 30
order: 7
---

## Strings In Depth

Python strings are one of the most-used types in the language. This lesson goes beyond the basics — you will understand how strings work internally, master the full `str` API, and write clean, efficient string-handling code.

---

## String Immutability and Internals

Strings in Python are **immutable sequences of Unicode code points**. Once created, you cannot change a character in place.

```python
s = "hello"
# s[0] = "H"  # TypeError: 'str' object does not support item assignment

# Every "modification" creates a new string
s2 = s.upper()
print(s)   # hello  (unchanged)
print(s2)  # HELLO  (new object)
```

Python uses **string interning** for short strings and string literals to save memory. Interned strings share the same object in memory:

```python
a = "hello"
b = "hello"
print(a is b)  # True  — interned, same object

a = "hello world"  # space breaks simple interning rules
b = "hello world"
print(a is b)  # May be False (implementation-defined)
```

Use `==` for value comparison, not `is`. The `is` check on strings is an implementation detail and not reliable for arbitrary strings.

---

## Key String Methods

### Splitting and Joining

`split()` breaks a string into a list; `join()` assembles a list into a string.

```python
line = "  Alice,30,Engineer  "

# split on delimiter
parts = line.strip().split(",")
print(parts)  # ['Alice', '30', 'Engineer']

# split with limit
first, rest = "one:two:three".split(":", 1)
print(first)  # one
print(rest)   # two:three

# splitlines — splits on \n, \r\n, \r
text = "line1\nline2\r\nline3"
print(text.splitlines())  # ['line1', 'line2', 'line3']

# join — ALWAYS use join() to concatenate many strings
words = ["the", "quick", "brown", "fox"]
sentence = " ".join(words)
print(sentence)  # the quick brown fox

csv_row = ",".join(["Alice", "30", "Engineer"])
print(csv_row)  # Alice,30,Engineer
```

### Stripping Whitespace

```python
s = "   hello world   "
print(s.strip())    # "hello world"
print(s.lstrip())   # "hello world   "
print(s.rstrip())   # "   hello world"

# Strip specific characters (any char in the string, not a substring)
s = "###hello###"
print(s.strip("#"))   # hello

s = "aabcaa"
print(s.strip("a"))   # bc
```

### Replace, Find, Count

```python
text = "the cat sat on the mat"

# replace(old, new, count=-1)
print(text.replace("at", "og"))         # the cog sog on the mog
print(text.replace("at", "og", 1))      # the cog sat on the mat

# find returns index or -1 (never raises)
print(text.find("cat"))    # 4
print(text.find("dog"))    # -1

# index raises ValueError if not found
print(text.index("cat"))   # 4
# text.index("dog")        # ValueError

# rfind / rindex — search from right
print(text.rfind("at"))   # 21  (the "at" in "mat")

# count non-overlapping occurrences
print(text.count("at"))   # 3
print("aaa".count("aa"))  # 1  (non-overlapping!)
```

### Start/End Checks

```python
filename = "report_2024.csv"

print(filename.startswith("report"))      # True
print(filename.endswith(".csv"))          # True
print(filename.endswith((".csv", ".txt")))  # True — tuple of suffixes!

urls = [
    "https://example.com",
    "http://insecure.com",
    "ftp://files.example.com",
]
secure = [u for u in urls if u.startswith("https://")]
print(secure)  # ['https://example.com']
```

### Case Methods

```python
s = "hello world"

print(s.upper())       # HELLO WORLD
print(s.lower())       # hello world  (no-op here)
print(s.title())       # Hello World
print(s.capitalize())  # Hello world  (only first char uppercased)
print(s.swapcase())    # HELLO WORLD

# Case-insensitive comparison
user_input = "Yes"
if user_input.lower() == "yes":
    print("Confirmed")
```

### Padding and Alignment

```python
# zfill — zero-pad numbers (preserves sign)
print("42".zfill(6))     # 000042
print("-42".zfill(6))    # -00042
print("3.14".zfill(7))   # 0003.14

# center, ljust, rjust
label = "Python"
print(label.center(20))          # "       Python       "
print(label.center(20, "-"))     # -------Python-------
print(label.ljust(20, "."))      # Python..............
print(label.rjust(20, "."))      # ..............Python

# Useful for simple text tables
headers = ["Name", "Score", "Grade"]
row     = ["Alice", "98",    "A+"]
col_w = 12
print("".join(h.ljust(col_w) for h in headers))
print("".join(v.ljust(col_w) for v in row))
```

### Checking String Content

```python
print("hello123".isalnum())   # True
print("hello".isalpha())      # True
print("123".isdigit())        # True
print("123".isnumeric())      # True (also handles ², ³, etc.)
print("  \t\n".isspace())     # True
print("Hello World".istitle())# True
print("HELLO".isupper())      # True
print("hello".islower())      # True
```

---

## String Formatting

Python has three generations of string formatting. Know all three — you will encounter them in the wild.

### Legacy: % Formatting

```python
name = "Alice"
score = 98.5

print("Hello, %s! Your score is %.1f." % (name, score))
# Hello, Alice! Your score is 98.5.

# Common format codes
print("%d" % 42)          # 42       (integer)
print("%05d" % 42)        # 00042    (zero-padded)
print("%10s" % "hi")      # "        hi" (right-aligned)
print("%-10s|" % "hi")    # "hi        |" (left-aligned)
print("%x" % 255)         # ff       (hex lower)
print("%X" % 255)         # FF       (hex upper)
print("%e" % 123456.789)  # 1.234568e+05
```

### .format() Method

```python
# Positional
print("{} + {} = {}".format(1, 2, 3))  # 1 + 2 = 3

# Named
print("{name} is {age} years old.".format(name="Bob", age=25))

# Format spec: [[fill]align][sign][width][grouping][.precision][type]
print("{:10}".format("left"))     # "left      " (default left for str)
print("{:>10}".format("right"))   # "     right"
print("{:^10}".format("center"))  # "  center  "
print("{:*^10}".format("hi"))     # "****hi****"
print("{:.2f}".format(3.14159))   # 3.14
print("{:,.2f}".format(1234567.8))# 1,234,567.80
print("{:08.2f}".format(3.14))    # 00003.14
print("{:b}".format(42))          # 101010 (binary)
print("{:x}".format(255))         # ff     (hex)
print("{:X}".format(255))         # FF
print("{:e}".format(12345.678))   # 1.234568e+04
print("{:%}".format(0.8765))      # 87.650000%
```

### f-strings (Python 3.6+) — Preferred

f-strings are the fastest and most readable option.

```python
name = "Alice"
score = 98.5
rank = 1

# Basic
print(f"Hello, {name}!")                   # Hello, Alice!

# Expressions inside {}
print(f"2 + 2 = {2 + 2}")                 # 2 + 2 = 4
print(f"Upper: {name.upper()}")            # Upper: ALICE

# Format specs work the same way
print(f"{score:.2f}")                      # 98.50
print(f"{1234567:,}")                      # 1,234,567
print(f"{255:#010x}")                      # 0x000000ff
print(f"{42:08b}")                         # 00101010
print(f"{0.876:.1%}")                      # 87.6%

# = specifier (Python 3.8+): prints "name=value" — great for debugging
x = 42
print(f"{x=}")             # x=42
print(f"{name=}")          # name='Alice'
print(f"{score * 2=}")     # score * 2=197.0
print(f"{score=:.1f}")     # score=98.5

# Nested f-strings
width = 15
print(f"{'centered':^{width}}")   # "    centered   "

# Multi-line f-strings
query = (
    f"SELECT *"
    f" FROM users"
    f" WHERE name = '{name}'"
    f" AND score > {score - 10:.0f}"
)
print(query)
# SELECT * FROM users WHERE name = 'Alice' AND score > 88
```

---

## Raw Strings

Prefix `r` (or `R`) tells Python not to process backslash escape sequences.

```python
# Without r: \n is newline, \t is tab
normal = "C:\new_folder\test.txt"
print(normal)
# C:
# ew_folder	est.txt    ← WRONG!

# With r: backslashes are literal
path = r"C:\new_folder\test.txt"
print(path)  # C:\new_folder\test.txt

# Raw strings are essential for regex patterns
import re
# Without r, you'd need to double every backslash
pattern_bad  = "\\d{3}-\\d{4}"
pattern_good = r"\d{3}-\d{4}"

phone = "Call 555-1234 now"
print(re.search(pattern_good, phone).group())  # 555-1234
```

A raw string cannot end with an odd number of backslashes: `r"\"` is a syntax error. Use `"\\"` in that case.

---

## Multiline Strings

Triple quotes (`"""` or `'''`) span multiple lines.

```python
sql = """
    SELECT u.name, COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    WHERE u.active = 1
    GROUP BY u.id
    ORDER BY order_count DESC
"""

# Inspect whitespace — there IS a leading newline
print(repr(sql[:30]))  # '\n    SELECT u.name, COUNT(o.id)'

# textwrap.dedent removes common leading whitespace
import textwrap
clean_sql = textwrap.dedent(sql).strip()

# Multiline f-string
name = "Alice"
body = f"""
Dear {name},

Your account has been activated.

Regards,
The Team
""".strip()
print(body)
```

---

## Bytes vs str: Encoding and Decoding

Python 3 strictly separates **text** (`str`, Unicode) from **binary data** (`bytes`).

```python
# str → bytes: encode
text = "Hello, World!"
encoded = text.encode("utf-8")
print(encoded)        # b'Hello, World!'
print(type(encoded))  # <class 'bytes'>

# bytes → str: decode
decoded = encoded.decode("utf-8")
print(decoded)        # Hello, World!
print(type(decoded))  # <class 'str'>

# Non-ASCII characters
emoji = "Hello 🐍"
utf8_bytes = emoji.encode("utf-8")
print(utf8_bytes)   # b'Hello \xf0\x9f\x90\x8d'
print(len(emoji))   # 7  (characters)
print(len(utf8_bytes))  # 10  (bytes — snake emoji is 4 bytes in UTF-8)

# Encoding errors
text_with_emoji = "caf\u00e9"  # café
latin1 = text_with_emoji.encode("latin-1")  # works — é in latin-1
print(latin1)  # b'caf\xe9'

# Handling errors
dodgy = b"\xff\xfe"
print(dodgy.decode("utf-8", errors="ignore"))   # empty — invalid bytes dropped
print(dodgy.decode("utf-8", errors="replace"))  # "??" — replaced with ?
print(dodgy.decode("utf-8", errors="backslashreplace"))  # \\xff\\xfe

# Reading a file with explicit encoding
with open("data.txt", "w", encoding="utf-8") as f:
    f.write("café\n")

with open("data.txt", "r", encoding="utf-8") as f:
    content = f.read()
print(content)  # café
```

---

## The String Building Pitfall: + in Loops is O(n²)

Because strings are immutable, concatenation with `+` creates a **new** string each iteration. For `n` iterations of average length `k`, you allocate `n` strings of total size `O(n²k)`.

```python
import time

n = 100_000

# BAD: O(n²) — creates n intermediate string objects
start = time.perf_counter()
result = ""
for i in range(n):
    result += str(i)
bad_time = time.perf_counter() - start
print(f"Concatenation (+): {bad_time:.3f}s, length={len(result)}")

# GOOD: O(n) — list.append is O(1) amortized, join does one allocation
start = time.perf_counter()
parts = []
for i in range(n):
    parts.append(str(i))
result = "".join(parts)
good_time = time.perf_counter() - start
print(f"join():           {good_time:.3f}s, length={len(result)}")

# BEST: use a generator expression directly
result = "".join(str(i) for i in range(n))

# For building lines in a report
lines = []
for name, score in [("Alice", 98), ("Bob", 85), ("Charlie", 92)]:
    lines.append(f"  {name:<10} {score:>5}")
report = "\n".join(lines)
print(report)
```

Note: CPython has an optimization that sometimes makes `+=` in a loop faster than it should be (when the string has only one reference). Do not rely on this — use `join()` for clarity and portability.

---

## Useful String Recipes

```python
# Slugify a title
import re

def slugify(title: str) -> str:
    slug = title.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)        # remove punctuation
    slug = re.sub(r"[\s_-]+", "-", slug)         # spaces/underscores → dash
    slug = re.sub(r"^-+|-+$", "", slug)          # trim leading/trailing dashes
    return slug

print(slugify("  Hello, World! It's a Test... "))  # hello-world-its-a-test

# Truncate with ellipsis
def truncate(s: str, max_len: int = 50) -> str:
    return s if len(s) <= max_len else s[:max_len - 3] + "..."

print(truncate("A very long title that goes on and on forever", 30))
# A very long title that goes on...

# Count words
text = "the quick brown fox jumps over the lazy dog"
from collections import Counter
word_counts = Counter(text.split())
print(word_counts.most_common(3))  # [('the', 2), ('quick', 1), ('brown', 1)]

# Check if a string is a valid identifier
names = ["my_var", "2bad", "hello-world", "_private", "__dunder__"]
for n in names:
    print(f"{n!r:20} valid={n.isidentifier()}")
```

---

## Key Takeaways

- Strings are **immutable Unicode sequences**. All methods return new strings; the original is never changed.
- Use `str.join(iterable)` to concatenate many strings. Never use `+` inside a loop.
- **f-strings** are the modern standard. The `=` specifier (`f"{x=}"`) is invaluable for quick debugging.
- Use **raw strings** (`r"..."`) whenever writing regex patterns or Windows file paths.
- Python 3 separates `str` (text, Unicode) from `bytes` (binary). Always specify `encoding="utf-8"` when opening text files.
- Learn `split`, `join`, `strip`, `replace`, `find`, `startswith`, `endswith` — these cover 90% of real string work.
- Format specs (`:.2f`, `:>10`, `:,`, `:b`, `:x`) work identically in `.format()` and f-strings.
