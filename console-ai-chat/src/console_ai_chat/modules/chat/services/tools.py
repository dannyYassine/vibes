import ast
import datetime as dt
import operator as _op
import random

from langchain.tools import tool


@tool
def get_current_time() -> str:
    """Get the current date and time in ISO format. Use when the user asks what time it is or today's date."""
    return dt.datetime.now().isoformat(timespec="seconds")


@tool
def get_random_number(min_value: int = 1, max_value: int = 100) -> int:
    """Get a random integer between min_value and max_value."""
    return random.randint(min_value, max_value)


@tool
def count_words(text: str) -> int:
    """Count the number of words in the given text."""
    return len(text.split())


@tool
def calculate(expression: str) -> float:
    """Evaluate a simple arithmetic expression using numbers and basic operators (+, -, *, /, //, %, **, parentheses). Input must be a plain arithmetic string like '2 + 2' or '3 * (4 - 1)'. Not for evaluating code or variables."""
    return _safe_eval(expression)


_BIN_OPS = {
    ast.Add: _op.add,
    ast.Sub: _op.sub,
    ast.Mult: _op.mul,
    ast.Div: _op.truediv,
    ast.FloorDiv: _op.floordiv,
    ast.Mod: _op.mod,
    ast.Pow: _op.pow,
}
_UNARY_OPS = {ast.UAdd: _op.pos, ast.USub: _op.neg}


def _safe_eval(expr: str) -> float:
    tree = ast.parse(expr, mode="eval")
    return _eval_node(tree.body)


def _eval_node(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _BIN_OPS:
        return _BIN_OPS[type(node.op)](_eval_node(node.left), _eval_node(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPS:
        return _UNARY_OPS[type(node.op)](_eval_node(node.operand))
    raise ValueError(f"unsupported expression: {ast.dump(node)}")
