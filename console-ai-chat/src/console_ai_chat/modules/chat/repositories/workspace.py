import os
import subprocess
from pathlib import Path

from langchain.tools import tool

BASE = Path(os.getenv("WORKSPACE", "/workspace")).resolve()
try:
    BASE.mkdir(parents=True, exist_ok=True)
except OSError:
    BASE = Path.cwd().resolve()
    BASE.mkdir(parents=True, exist_ok=True)

MAX_READ_CHARS = 100_000
MAX_OUTPUT_CHARS = 4_000
CMD_TIMEOUT_SECONDS = 60


def _safe(path_str: str) -> Path:
    path = (BASE / path_str).resolve()
    if path != BASE and not path.is_relative_to(BASE):
        raise ValueError(f"path escapes workspace: {path_str}")
    return path


@tool
def list_files(path: str = "") -> str:
    """List files and directories inside the workspace. path is relative to the workspace root ('' = root). Returns one entry per line, with a trailing / for directories; does not recurse."""
    target = _safe(path)
    if target.is_file():
        return str(target.relative_to(BASE))
    if not target.is_dir():
        raise ValueError(f"not a directory: {path}")
    entries = sorted(os.listdir(target))
    return "\n".join(
        entry + ("/" if (target / entry).is_dir() else "") for entry in entries
    )


@tool
def read_file(path: str) -> str:
    """Read a text file from the workspace and return its content. path is relative to the workspace root. Content is truncated to 100k characters."""
    target = _safe(path)
    if not target.is_file():
        raise ValueError(f"file not found: {path}")
    content = target.read_text(encoding="utf-8", errors="replace")
    if len(content) > MAX_READ_CHARS:
        content = content[:MAX_READ_CHARS] + "\n...[truncated]"
    return content


@tool
def write_file(path: str, content: str) -> str:
    """Create or overwrite a text file in the workspace, creating parent directories as needed. path is relative to the workspace root. Returns how many bytes were written. Not for binary files."""
    target = _safe(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return f"wrote {len(content.encode('utf-8'))} bytes to {target.relative_to(BASE)}"


@tool
def append_file(path: str, content: str) -> str:
    """Append text to the end of a file in the workspace, creating it if it does not exist. path is relative to the workspace root."""
    target = _safe(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    before = target.stat().st_size if target.exists() else 0
    with target.open("a", encoding="utf-8") as handle:
        handle.write(content)
    return f"appended {len(content.encode('utf-8'))} bytes to {target.relative_to(BASE)} (was {before} bytes)"


@tool
def edit_file(
    path: str, old: str, new: str, line: int | None = None, replace_all: bool = False
) -> str:
    """Replace text inside a file, in place — a middle-of-file edit. old must occur in the file. Scope: give line (1-indexed) to limit the replace to that single line; without it, the first occurrence in the whole file is replaced, and every occurrence with replace_all. Errors if old is not found within the selected scope."""
    target = _safe(path)
    if not target.is_file():
        raise ValueError(f"file not found: {path}")
    if not old:
        raise ValueError("old text must not be empty")
    content = target.read_text(encoding="utf-8")
    if line is not None:
        lines = content.split("\n")
        if not 1 <= line <= len(lines):
            raise ValueError(f"line {line} out of range (file has {len(lines)} lines)")
        idx = line - 1
        count = lines[idx].count(old)
        if count == 0:
            raise ValueError(f"old text not found on line {line}")
        if replace_all:
            lines[idx] = lines[idx].replace(old, new)
        else:
            lines[idx] = lines[idx].replace(old, new, 1)
        updated = "\n".join(lines)
        scope = f"line {line}"
    else:
        count = content.count(old)
        if count == 0:
            raise ValueError(f"old text not found in {path}")
        updated = (
            content.replace(old, new) if replace_all else content.replace(old, new, 1)
        )
        scope = "file"
    target.write_text(updated, encoding="utf-8")
    return f"replaced {count if replace_all else 1} occurrence(s) in {scope} of {path}"


@tool
def run_command(command: str) -> str:
    """Run a shell command inside the workspace directory (e.g. build, test, or project commands). Returns combined stdout and stderr, truncated to 4k characters. Times out after 60 seconds — use only for quick commands."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=BASE,
            capture_output=True,
            text=True,
            timeout=CMD_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return f"[error] command timed out after {CMD_TIMEOUT_SECONDS}s"
    output = (result.stdout or "") + (result.stderr or "")
    if len(output) > MAX_OUTPUT_CHARS:
        output = output[:MAX_OUTPUT_CHARS] + "\n...[truncated]"
    status = "ok" if result.returncode == 0 else f"exit {result.returncode}"
    return f"[{status}]\n{output}"
