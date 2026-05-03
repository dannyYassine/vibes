"""CLI entry point: interactive chat or one-shot task for the supervisor agent."""

from __future__ import annotations

import logging
import sys

from dotenv import load_dotenv


def main() -> None:
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(name)s | %(message)s")

    # Defer import so env vars are loaded before module-level config runs
    from supervisor_agent.supervisor import supervisor  # noqa: PLC0415

    # One-shot mode if args provided
    if len(sys.argv) > 1:
        task = " ".join(sys.argv[1:])
        result = supervisor.invoke({"messages": [{"role": "user", "content": task}]})
        print(result["messages"][-1].content)
        return

    # Interactive chat loop
    messages: list[dict[str, str]] = []
    print("agent> Interactive mode. Type 'exit' or Ctrl+C to quit.")
    while True:
        try:
            user_input = input("you> ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nBye.")
            break
        if not user_input:
            continue
        if user_input.lower() in ("exit", "quit"):
            print("Bye.")
            break
        messages.append({"role": "user", "content": user_input})
        result = supervisor.invoke({"messages": messages})
        reply = result["messages"][-1].content
        print(f"agent> {reply}")
        messages = [{"role": m["role"] if isinstance(m, dict) else m.type, "content": m["content"] if isinstance(m, dict) else m.content} for m in result["messages"]]


if __name__ == "__main__":
    main()
