---
title: "String Mastery: f-strings, Templates, Bytes"
description: "Advanced string techniques including f-string expressions, bytes handling, and text processing."
duration_minutes: 25
order: 3
---

## Overview

Python strings are rich. f-strings (introduced in Python 3.6) are not just variable interpolation — they support arbitrary expressions, format specifications, and debugging shortcuts. Beyond f-strings, you need to understand bytes, encoding, and the standard library tools for text processing. This lesson covers the full picture.

---

## f-strings: Beyond Basic Interpolation

### Arbitrary Expressions

Any valid Python expression can appear inside `{}`:

```python
name = "Alice"
scores = [95, 82, 88]

# Method calls
print(f"{name.upper()}")              # ALICE
print(f"{'hello':^20}")              # centered in 20 chars

# Arithmetic
radius = 5
print(f"Area: {3.14159 * radius**2:.2f}")  # Area: 78.54

# Conditional expressions
age = 20
print(f"Status: {'adult' if age >= 18 else 'minor'}")

# List comprehension (works, but prefer pre-computing for clarity)
nums = [1, 2, 3, 4, 5]
print(f"Evens: {[x for x in nums if x % 2 == 0]}")  # Evens: [2, 4]

# Function calls
import math
print(f"sqrt(2) = {math.sqrt(2):.6f}")    # sqrt(2) = 1.414214
```

### Conversion Flags: !r, !s, !a

```python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __str__(self):
        return f"({self.x}, {self.y})"
    def __repr__(self):
        return f"Point({self.x!r}, {self.y!r})"

p = Point(1, 2)
print(f"{p}")       # (1, 2)       — uses __str__
print(f"{p!s}")     # (1, 2)       — explicitly forces __str__
print(f"{p!r}")     # Point(1, 2)  — uses __repr__, useful for debugging
print(f"{p!a}")     # Point(1, 2)  — ASCII-only repr, non-ASCII chars escaped

text = "café"
print(f"{text!r}")  # 'café'       — quotes added
print(f"{text!a}")  # 'caf\xe9'    — non-ASCII escaped
```

### Format Specifications

The format spec comes after `:` inside the braces and mirrors the `format()` mini-language:

```python
pi = 3.141592653589793
n  = 1234567
pct = 0.87654

# Float precision
print(f"{pi:.2f}")          # 3.14
print(f"{pi:.6f}")          # 3.141593
print(f"{pi:e}")            # 3.141593e+00  scientific notation
print(f"{pi:.3g}")          # 3.14  (significant digits, trims trailing zeros)

# Integer formatting
print(f"{n:,}")             # 1,234,567  (thousands separator)
print(f"{n:_}")             # 1_234_567  (underscore separator, Python 3.6+)
print(f"{n:08d}")           # 01234567  (zero-padded to width 8)
print(f"{255:#x}")          # 0xff      (hex with prefix)
print(f"{255:#X}")          # 0XFF
print(f"{255:#b}")          # 0b11111111  (binary with prefix)
print(f"{255:#o}")          # 0o377      (octal with prefix)
print(f"{10:08b}")          # 00001010   (binary, zero-padded)

# Percentage
print(f"{pct:.1%}")         # 87.7%
print(f"{pct:.2%}")         # 87.65%

# Alignment
name = "Alice"
print(f"{name:<10}")        # "Alice     "  left-aligned in 10 chars
print(f"{name:>10}")        # "     Alice"  right-aligned
print(f"{name:^10}")        # "  Alice   "  centered
print(f"{name:-^20}")       # "-------Alice--------"  centered with fill char

# Sign
print(f"{42:+d}")           # +42
print(f"{-42:+d}")          # -42
print(f"{42: d}")           # " 42" (space for positive, keeps alignment with negatives)
```

### Debug Format with `=`

Python 3.8+ supports `=` inside the braces to print both the expression and its value — invaluable for debugging:

```python
x = 42
y = [1, 2, 3]
result = x * 2 + 1

print(f"{x=}")          # x=42
print(f"{y=}")          # y=[1, 2, 3]
print(f"{result=}")     # result=85
print(f"{len(y)=}")     # len(y)=3
print(f"{x + y[0]=}")   # x + y[0]=43

# Combine = with format spec
pi = 3.14159
print(f"{pi=:.2f}")     # pi=3.14
```

### Nested f-strings (Python 3.12+)

Python 3.12 fully allows nested quotes and complex expressions in f-strings:

```python
precision = 4
pi = 3.14159265

# Nested format spec — compute width/precision dynamically
print(f"{pi:.{precision}f}")        # 3.1416  (works in 3.6+)
print(f"{'hi':{'<' if True else '>'}10}")  # "hi        "

# Python 3.12: quotes can match the outer quotes
# print(f"{'hello'}")   # works in 3.12+, SyntaxError in earlier versions
```

---

## string.Template: Safe User-Controlled Templates

When the template string comes from user input or configuration, f-strings are dangerous because they can execute arbitrary code. Use `string.Template` instead.

```python
from string import Template

# Basic usage
t = Template("Hello, $name! You have $count messages.")
result = t.substitute(name="Alice", count=5)
print(result)   # Hello, Alice! You have 5 messages.

# ${var} syntax for disambiguation
t = Template("${item}s are available")
print(t.substitute(item="book"))   # books are available

# substitute() raises KeyError for missing variables
try:
    t.substitute(item="pen")    # 'count' missing
except KeyError as e:
    print(f"Missing key: {e}")

# safe_substitute() leaves missing $vars unchanged — useful for partial templates
t = Template("Dear $name, your order $order_id is ready.")
partial = t.safe_substitute(name="Bob")
print(partial)   # Dear Bob, your order $order_id is ready.

# Real use: email templates where some fields are filled later
email_template = Template("""\
Subject: $subject

Dear $recipient,

$body

Regards,
$sender
""")

filled = email_template.safe_substitute(
    subject="Your Invoice",
    recipient="Alice",
    sender="Support Team"
)
# body is left as $body for a second-pass substitution
```

**Why not f-strings for user templates?**

```python
# DANGEROUS — user-controlled f-string equivalent
user_template = "Hello {name}"
# If you eval() this or use format() carelessly with user data, code injection is possible
eval(f'f"{user_template}"')   # NEVER do this

# SAFE — Template with safe_substitute
Template(user_template).safe_substitute(name="Alice")
```

---

## bytes and bytearray

Python distinguishes text (`str`) from binary data (`bytes`). This is important for network programming, cryptography, file I/O, and protocol implementations.

```python
# bytes literals
b1 = b"hello"
b2 = bytes([72, 101, 108, 108, 111])   # from list of ints 0-255
b3 = bytes(5)                           # 5 zero bytes: b'\x00\x00\x00\x00\x00'

print(b1)                  # b'hello'
print(b1[0])               # 72  (bytes index gives int, not bytes)
print(b1[1:3])             # b'el'
print(len(b1))             # 5

# bytes is immutable — bytearray is mutable
ba = bytearray(b"hello")
ba[0] = 72                 # fine — bytearray supports item assignment
ba.append(33)              # add '!'
print(bytes(ba))           # b'Hello!'
```

### Encoding and Decoding

```python
# str -> bytes: encode
text = "Hello, World!"
b = text.encode("utf-8")          # b'Hello, World!'
b = text.encode("ascii")          # b'Hello, World!'  (same for ASCII-only text)
b = text.encode("utf-16")         # includes BOM and different byte layout

# bytes -> str: decode
s = b.decode("utf-8")
s = b.decode("utf-8", errors="replace")   # replace undecodable bytes with ?
s = b.decode("utf-8", errors="ignore")    # skip undecodable bytes

# Unicode text with non-ASCII characters
text = "café"
b_utf8  = text.encode("utf-8")     # b'caf\xc3\xa9'  (4 bytes for é)
b_latin = text.encode("latin-1")   # b'caf\xe9'       (1 byte for é)

# Round-trip must use matching encoding
assert b_utf8.decode("utf-8") == text

# Common error: decode with wrong encoding
try:
    b_utf8.decode("ascii")
except UnicodeDecodeError as e:
    print(f"Cannot decode: {e}")
```

### bytes Methods

```python
data = b"\x48\x65\x6c\x6c\x6f\x0a"

# Hex representation
print(data.hex())                  # "48656c6c6f0a"
print(data.hex(":"))               # "48:65:6c:6c:6f:0a"  (Python 3.8+)

# From hex
restored = bytes.fromhex("48656c6c6f0a")
print(restored)                    # b'Hello\n'

# Integer to/from bytes (for binary protocols)
n = 1024
b = n.to_bytes(2, byteorder="big")    # b'\x04\x00'  (2 bytes, big-endian)
b = n.to_bytes(4, byteorder="little") # b'\x00\x04\x00\x00'

recovered = int.from_bytes(b"\x04\x00", byteorder="big")
print(recovered)   # 1024

# Familiar string-like methods work on bytes too
print(b"hello world".split(b" "))   # [b'hello', b'world']
print(b"hello".upper())             # b'HELLO'
print(b"  hello  ".strip())         # b'hello'
```

---

## Unicode: ord(), chr(), and Normalization

```python
import unicodedata

# ord() — character to Unicode code point
print(ord("A"))       # 65
print(ord("é"))       # 233
print(ord("中"))      # 20013

# chr() — code point to character
print(chr(65))        # A
print(chr(233))       # é
print(chr(0x1F600))   # 😀 (emoji)

# Unicode escapes in strings
s = "\u00e9"    # é    (BMP character, 4-hex U+XXXX)
s = "\U0001F600"  # 😀  (supplementary plane, 8-hex U+XXXXXXXX)
s = "\N{SNOWMAN}"   # ☃   (named Unicode character)

# Unicode normalization — important for comparisons
# "é" can be one character (U+00E9) or two (e + combining accent U+0301)
nfc = unicodedata.normalize("NFC", "é")    # precomposed form
nfd = unicodedata.normalize("NFD", "é")    # decomposed form
print(len(nfc))   # 1
print(len(nfd))   # 2
print(nfc == nfd) # False! — same visual appearance, different bytes

# For string comparisons across systems, normalize first
def normalize_text(s: str) -> str:
    return unicodedata.normalize("NFC", s)

# Get unicode category and name
print(unicodedata.name("é"))      # LATIN SMALL LETTER E WITH ACUTE
print(unicodedata.category("A"))  # Lu  (Letter, uppercase)
print(unicodedata.category("1"))  # Nd  (Number, decimal digit)
```

---

## textwrap: Formatting Long Text

```python
import textwrap

long_text = (
    "Python is a high-level, general-purpose programming language. "
    "Its design philosophy emphasizes code readability with the use of "
    "significant indentation. Python is dynamically typed and garbage-collected."
)

# Wrap to a given width
print(textwrap.fill(long_text, width=50))
# Python is a high-level, general-purpose
# programming language. Its design philosophy
# ...

# wrap() returns a list of lines
lines = textwrap.wrap(long_text, width=60)

# dedent() — remove common leading whitespace (useful for docstrings)
code = """
    def hello():
        print("hello")
        return 42
"""
print(textwrap.dedent(code))
# def hello():
#     print("hello")
#     return 42

# indent() — add a prefix to each line
indented = textwrap.indent(long_text[:100], prefix="  > ")
print(indented)

# shorten() — truncate to width, preserving word boundaries
short = textwrap.shorten(long_text, width=60, placeholder="...")
print(short)
# Python is a high-level, general-purpose programming...
```

---

## String Interning

CPython automatically interns (caches and reuses) some strings:

```python
# Short strings that look like identifiers are usually interned
a = "hello"
b = "hello"
print(a is b)   # True — same object in CPython

# Strings with spaces are NOT automatically interned
a = "hello world"
b = "hello world"
print(a is b)   # False (usually) — different objects

# NEVER use `is` to compare strings for equality
# Always use ==
a = "hello"
b = "hello"
print(a == b)   # True  — always correct
print(a is b)   # True  — accidentally correct due to interning, but NOT reliable

# Explicit interning with sys.intern (rare — only needed for large symbol tables)
import sys
a = sys.intern("my_long_identifier_used_thousands_of_times")
b = sys.intern("my_long_identifier_used_thousands_of_times")
print(a is b)   # True — explicitly interned, same object
```

When does explicit interning help? If you have a huge number of identical strings (e.g., column names in a data processing pipeline appearing millions of times), interning reduces memory usage and makes `is` comparisons O(1) instead of O(n). In practice, this is rarely needed.

---

## Key Takeaways

- **f-strings support full expressions** — method calls, arithmetic, conditionals, and comprehensions. Use `!r` for repr, `!s` for str, `!a` for ASCII-safe repr.
- **Format specs** (`:.2f`, `:,`, `:>10`, `:#x`) are the idiomatic way to control number and string formatting — no need for `%` formatting or manual padding.
- **`f"{value=}`** (Python 3.8+) is the quickest debugging print. It outputs both the expression name and its value.
- **`string.Template`** with `safe_substitute()` is the safe choice for user-provided or configuration-driven templates where you cannot trust the input.
- **Always specify encoding** when calling `.encode()` / `.decode()` — do not rely on platform defaults. UTF-8 is the right choice for nearly all new code.
- **`bytes.hex()` and `bytes.fromhex()`** are the clean way to convert between raw bytes and hex strings.
- **Unicode normalization** matters when comparing strings from different sources — "é" as NFC (one char) and NFD (two chars) are not equal without normalizing first.
- **`textwrap.dedent()`** is essential for multi-line string literals in code — it removes the leading indentation that would otherwise appear in the output.
- **Never use `is` to compare strings** for equality — always use `==`. String interning is an implementation detail, not a guarantee.
