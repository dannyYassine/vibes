import os

import pytest
from langchain.agents.middleware.types import ToolCallRequest
from langchain.messages import ToolMessage

from console_ai_chat.modules.chat.services import confirm


def request(**args):
    return ToolCallRequest(
        tool_call={"name": "echo", "args": args, "id": "call-1"},
        tool=None,
        state={},
        runtime=None,
    )


def handler(req):
    return ToolMessage(
        content=f"ran {req.tool_call['args']}",
        tool_call_id=req.tool_call.get("id", ""),
    )


def seq(*answers):
    iterator = iter(answers)
    return lambda _: next(iterator)


class TestDecide:
    def test_confirm(self):
        assert confirm.decide("echo", {"a": 1}, input_fn=lambda _: "y").action == "confirm"

    def test_cancel(self):
        d = confirm.decide("echo", {"a": 1}, input_fn=lambda _: "c")
        assert d.action == "cancel"

    def test_edit_confirmed(self):
        d = confirm.decide("echo", {"a": 1}, input_fn=seq("e", '{"b": 2}'))
        assert d.action == "edit"
        assert d.args == {"b": 2}

    def test_default_blank_is_cancel(self):
        assert confirm.decide("echo", {"a": 1}, input_fn=lambda _: "").action == "cancel"

    def test_invalid_json_reprompts_then_cancel(self):
        d = confirm.decide("echo", {"a": 1}, input_fn=seq("e", "{bad", "c"))
        assert d.action == "cancel"

    def test_edit_non_object_rejected_then_cancel(self):
        d = confirm.decide("echo", {"a": 1}, input_fn=seq("e", "[1,2]", "c"))
        assert d.action == "cancel"


class TestMiddleware:
    def test_disabled_passthrough(self, monkeypatch):
        monkeypatch.setenv("CONFIRM_TOOL_CALLS", "0")
        mw = confirm.ConfirmToolMiddleware(input_fn=seq("c"))
        result = mw.wrap_tool_call(request(a=1), handler)
        assert isinstance(result, ToolMessage)
        assert result.content == "ran {'a': 1}"

    def test_cancel_returns_error_tool_message(self, monkeypatch):
        monkeypatch.delenv("CONFIRM_TOOL_CALLS", raising=False)
        mw = confirm.ConfirmToolMiddleware(input_fn=lambda _: "c")
        result = mw.wrap_tool_call(request(a=1), handler)
        assert isinstance(result, ToolMessage)
        assert result.status == "error"
        assert "[cancelled]" in result.content
        assert result.tool_call_id == "call-1"
        assert result.name == "echo"

    def test_confirm_calls_handler(self, monkeypatch):
        monkeypatch.delenv("CONFIRM_TOOL_CALLS", raising=False)
        mw = confirm.ConfirmToolMiddleware(input_fn=lambda _: "y")
        result = mw.wrap_tool_call(request(a=1), handler)
        assert result.content == "ran {'a': 1}"

    def test_edit_calls_handler_with_edited_args(self, monkeypatch):
        monkeypatch.delenv("CONFIRM_TOOL_CALLS", raising=False)
        mw = confirm.ConfirmToolMiddleware(input_fn=seq("e", '{"b": 3}'))
        result = mw.wrap_tool_call(request(a=1), handler)
        assert result.content == "ran {'b': 3}"

    def test_eof_treated_as_cancel(self, monkeypatch):
        monkeypatch.delenv("CONFIRM_TOOL_CALLS", raising=False)
        mw = confirm.ConfirmToolMiddleware(input_fn=lambda _: (_ for _ in ()).throw(EOFError))
        result = mw.wrap_tool_call(request(a=1), handler)
        assert result.status == "error"


def test_enabled():
    os.environ["CONFIRM_TOOL_CALLS"] = "1"
    assert confirm.enabled()
    os.environ["CONFIRM_TOOL_CALLS"] = "false"
    assert not confirm.enabled()
    os.environ.pop("CONFIRM_TOOL_CALLS", None)
    assert confirm.enabled()