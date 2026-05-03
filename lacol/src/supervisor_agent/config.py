"""Configuration: LM Studio URL, model name, workspace sandbox."""

from __future__ import annotations

import os
from pathlib import Path


def _get_env(key: str, default: str | None = None) -> str:
    value = os.environ.get(key, default)
    if value is None:
        raise RuntimeError(f"Required environment variable {key} is not set")
    return value


LM_STUDIO_URL: str = _get_env("LM_STUDIO_URL", "http://localhost:1234/v1")
MODEL_NAME: str = _get_env("MODEL_NAME", "qwen3.5-4b-instruct")

_workspace_raw: str = _get_env("AGENT_WORKSPACE")
if not os.path.isabs(_workspace_raw):
    raise RuntimeError(f"AGENT_WORKSPACE must be an absolute path, got: {_workspace_raw}")
AGENT_WORKSPACE: Path = Path(_workspace_raw).resolve()


def _safe(path: str) -> Path:
    """Resolve *path* inside the workspace; raise if it escapes."""
    candidate = (AGENT_WORKSPACE / path).resolve() if not os.path.isabs(path) else Path(path).resolve()
    if candidate != AGENT_WORKSPACE and AGENT_WORKSPACE not in candidate.parents:
        raise ValueError(
            f"Path {candidate} escapes workspace {AGENT_WORKSPACE}"
        )
    return candidate
