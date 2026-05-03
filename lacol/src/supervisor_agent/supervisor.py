"""Supervisor: delegates to four specialist subagents via tool calls."""

from __future__ import annotations

from typing import Annotated, Any

from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

from supervisor_agent.agents import fetch_agent, glob_agent, grep_agent, llm, read_agent, write_agent
from supervisor_agent.config import AGENT_WORKSPACE


def _run_subagent(agent: Any, task: str) -> str:
    """Invoke a subagent with a fresh HumanMessage; return its final message content."""
    result: dict[str, Any] = agent.invoke({"messages": [HumanMessage(content=task)]})
    content: str = result["messages"][-1].content  # type: ignore[union-attr]
    return content


@tool
def delegate_to_glob(
    task: Annotated[
        str,
        "Self-contained file-finding task. The subagent has no prior context — include the glob pattern and root path.",
    ],
) -> str:
    """Delegate a file-discovery task to the glob specialist."""
    return _run_subagent(glob_agent, task)


@tool
def delegate_to_grep(
    task: Annotated[
        str,
        "Self-contained content-search task. The subagent has no prior context — include the pattern, path, and what you want back.",
    ],
) -> str:
    """Delegate a content-search task to the grep specialist."""
    return _run_subagent(grep_agent, task)


@tool
def delegate_to_read(
    task: Annotated[
        str,
        "Self-contained file-read task. The subagent has no prior context — include the exact file path and line range if needed.",
    ],
) -> str:
    """Delegate a file-read task to the read specialist."""
    return _run_subagent(read_agent, task)


@tool
def delegate_to_write(
    task: Annotated[
        str,
        "Self-contained write/edit task. The subagent has no prior context — include the target path and the exact content or edit.",
    ],
) -> str:
    """Delegate a write or edit task to the write specialist."""
    return _run_subagent(write_agent, task)


@tool
def delegate_to_fetch(
    task: Annotated[
        str,
        "Self-contained web fetch task. Include the URL and what to extract or summarize.",
    ],
) -> str:
    """Delegate a web page fetch task to the fetch specialist."""
    return _run_subagent(fetch_agent, task)


supervisor = create_react_agent(
    model=llm,
    tools=[delegate_to_glob, delegate_to_grep, delegate_to_read, delegate_to_write, delegate_to_fetch],
    prompt=(
        f"You coordinate five specialists: glob (find files), grep (search content), "
        f"read (inspect files), write (create/edit files), and fetch (retrieve web pages). "
        f"Your workspace is: {AGENT_WORKSPACE} — all file operations are sandboxed to this directory. "
        f"For each step, choose one delegate tool and give it a fully self-contained task description — "
        f"the specialist cannot see any prior context. "
        f"Workflow: glob/grep to locate → read to inspect → write to change. "
        f"When the task is complete, respond to the user directly without calling any tools."
    ),
)
