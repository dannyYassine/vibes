"""Leaf tools: ripgrep, glob, read, write, str_replace — all sandboxed."""

from __future__ import annotations

import logging
import subprocess
from glob import glob as py_glob

from langchain_core.tools import tool

from supervisor_agent.config import _safe

logger = logging.getLogger(__name__)


@tool
def ripgrep(pattern: str, path: str = ".", glob: str | None = None) -> str:
    """Search for a regex pattern in files using ripgrep. Returns matching lines with file:line prefix."""
    logger.info("ripgrep: pattern=%r path=%r glob=%r", pattern, path, glob)
    target = _safe(path)
    cmd: list[str] = ["rg", "--no-heading", "-n", "--color=never", pattern, str(target)]
    if glob:
        cmd += ["-g", glob]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)  # noqa: S603
    output = result.stdout or result.stderr or "no matches"
    return output[:8000]


@tool
def glob_files(pattern: str, path: str = ".") -> str:
    """Find files matching a glob pattern (e.g. '**/*.py'). Returns one path per line."""
    logger.info("glob_files: pattern=%r path=%r", pattern, path)
    root = _safe(path)
    matches = py_glob(str(root / pattern), recursive=True)
    return "\n".join(matches[:500]) or "no matches"


@tool
def read_file(path: str, start_line: int = 1, end_line: int | None = None) -> str:
    """Read a file, optionally between start_line and end_line (1-indexed, inclusive)."""
    logger.info("read_file: path=%r lines=%d-%s", path, start_line, end_line)
    target = _safe(path)
    lines = target.read_text().splitlines()
    end = end_line or len(lines)
    selected = lines[start_line - 1 : end]
    return "\n".join(f"{i}\t{line}" for i, line in enumerate(selected, start=start_line))


@tool
def write_file(path: str, content: str) -> str:
    """Write content to a file, creating parent dirs. Overwrites existing files."""
    logger.info("write_file: path=%r bytes=%d", path, len(content))
    target = _safe(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)
    return f"wrote {len(content)} bytes to {target}"


@tool
def str_replace(path: str, old: str, new: str) -> str:
    """Replace exactly one occurrence of `old` with `new` in a file. Fails if count != 1."""
    logger.info("str_replace: path=%r old=%r new=%r", path, old[:50], new[:50])
    target = _safe(path)
    text = target.read_text()
    count = text.count(old)
    if count == 0:
        raise ValueError(f"`old` string not found in {target}")
    if count > 1:
        raise ValueError(f"`old` string appears {count} times in {target}, must be exactly 1")
    target.write_text(text.replace(old, new, 1))
    return f"patched {target}"


@tool
def fetch_url(url: str) -> str:
    """Fetch a web page and return its text content (truncated to 8000 chars)."""
    logger.info("fetch_url: url=%r", url)
    import urllib.request  # noqa: PLC0415

    with urllib.request.urlopen(url, timeout=30) as resp:  # noqa: S310
        return resp.read().decode("utf-8", errors="replace")[:8000]
