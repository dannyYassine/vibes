"""Sandbox escape tests for _safe() and tool-level path validation."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

# Set AGENT_WORKSPACE before importing config
_tmpdir = str(Path(tempfile.mkdtemp()).resolve())
os.environ["AGENT_WORKSPACE"] = _tmpdir

from supervisor_agent.config import _safe  # noqa: E402


class TestSafe:
    """_safe() must reject any path that resolves outside the workspace."""

    def test_relative_traversal(self) -> None:
        with pytest.raises(ValueError, match="escapes workspace"):
            _safe("../etc/passwd")

    def test_absolute_outside(self) -> None:
        with pytest.raises(ValueError, match="escapes workspace"):
            _safe("/etc/passwd")

    def test_double_traversal(self) -> None:
        with pytest.raises(ValueError, match="escapes workspace"):
            _safe("subdir/../../etc/passwd")

    def test_symlink_escape(self, tmp_path: Path) -> None:
        workspace = Path(_tmpdir)
        # Create a symlink inside workspace pointing outside
        link = workspace / "escape_link"
        link.symlink_to("/etc")
        try:
            with pytest.raises(ValueError, match="escapes workspace"):
                _safe("escape_link/passwd")
        finally:
            link.unlink()

    def test_valid_relative(self) -> None:
        result = _safe("src/main.py")
        assert str(result).startswith(_tmpdir)

    def test_valid_workspace_root(self) -> None:
        result = _safe(".")
        assert result == Path(_tmpdir).resolve()

    def test_valid_absolute_inside(self) -> None:
        inside = os.path.join(_tmpdir, "foo.txt")
        result = _safe(inside)
        assert result == Path(inside).resolve()
