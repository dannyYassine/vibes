import json
import os
from dataclasses import dataclass, field
from typing import Callable, Literal

from langchain.agents.middleware import AgentMiddleware
from langchain.messages import ToolMessage


@dataclass
class Decision:
    action: Literal["confirm", "edit", "cancel"]
    args: dict = field(default_factory=dict)


def enabled() -> bool:
    return os.getenv("CONFIRM_TOOL_CALLS", "1").lower() not in {"0", "false", "no", "off", ""}


def _read(input_fn: Callable[[str], str], prompt: str) -> str:
    try:
        return input_fn(prompt).strip().lower()
    except (EOFError, KeyboardInterrupt):
        return "c"


def _take_edit(input_fn: Callable[[str], str]) -> dict | None:
    try:
        raw = input_fn("  Edit args as JSON: ").strip()
    except (EOFError, KeyboardInterrupt):
        return None
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as err:
        print(f"  invalid JSON: {err}; retry or cancel")
        return None
    if not isinstance(parsed, dict):
        print("  edit must be a JSON object; retry or cancel")
        return None
    return parsed


def decide(tool_name: str, args: dict, input_fn: Callable[[str], str] = input) -> Decision:
    print(f"[tool {tool_name}] {json.dumps(args, default=str)}")
    while True:
        raw = _read(input_fn, "  Run? [y]es, [e]dit args, [c]ancel: ")
        if raw in {"y", "yes"}:
            return Decision("confirm", args)
        if raw in {"n", "no", "c", "cancel", "skip"} or raw == "":
            return Decision("cancel", args)
        if raw in {"e", "edit"}:
            edited = _take_edit(input_fn)
            if edited is not None:
                return Decision("edit", edited)
            continue
        print("  y = run, e = edit args as JSON, c = cancel")


class ConfirmToolMiddleware(AgentMiddleware):
    def __init__(self, input_fn: Callable[[str], str] = input):
        self._input_fn = input_fn

    def wrap_tool_call(self, request, handler):
        if not enabled():
            return handler(request)

        name = request.tool_call.get("name", "")
        args = request.tool_call.get("args") or {}
        decision = decide(name, args, input_fn=self._input_fn)

        if decision.action == "cancel":
            return ToolMessage(
                content="[cancelled] The user cancelled this tool call.",
                tool_call_id=request.tool_call.get("id", ""),
                name=name,
                status="error",
            )

        if decision.action == "edit":
            request = request.override(
                tool_call={
                    **request.tool_call,
                    "args": decision.args,
                }
            )
        return handler(request)