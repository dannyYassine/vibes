---
type: Reference
title: Agent Tools
description: General-purpose agent tool functions in tools.py, including an AST-whitelisted arithmetic evaluator.
tags: [reference, tools, agent]
timestamp: 2026-08-02T00:00:00Z
modules:
  - chat
---

# Agent Tools

## Source
`src/console_ai_chat/modules/chat/services/tools.py`

## Details
Four `@tool` (langchain.tools) functions; all pure, no side effects:

| Tool | Signature | Behavior |
|---|---|---|
| `get_current_time` | `() -> str` | ISO-8601 local datetime, seconds precision |
| `get_random_number` | `(min_value=1, max_value=100) -> int` | `random.randint` over range |
| `count_words` | `(text: str) -> int` | `len(text.split())` |
| `calculate` | `(expression: str) -> float` | AST-eval restricted to Constant / BinOp / UnaryOp over `+ - * / // % **`; unknown nodes raise `ValueError` |

Design notes:
- `calculate` deliberately never calls `eval()`. `ast.parse(expr, mode="eval")` then `_eval_node` walks the tree with whitelisted operator maps (`_BIN_OPS`, `_UNARY_OPS`). Safe against code/import execution.
- All four tools run through the confirmation gate (`ConfirmToolMiddleware`) before execution — same `y`/`e`/`c` prompt as the coding tools.

## Used By
- [Console Chat](/features/chat/index.md)