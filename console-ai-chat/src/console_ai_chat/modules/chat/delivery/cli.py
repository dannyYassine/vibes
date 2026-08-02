import os
import sys

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain.messages import AIMessage, AIMessageChunk, AnyMessage, HumanMessage, ToolMessage
from langchain_openrouter import ChatOpenRouter

from console_ai_chat.modules.chat.repositories import workspace as code_tools
from console_ai_chat.modules.chat.services import tools

SYSTEM_PROMPT = (
    "You are a coding assistant in a console chat. Answer concisely and clearly. "
    "You can inspect and edit files in a workspace and run shell commands there. "
    "Use the available tools when they make the task easier or more accurate, "
    "especially for anything involving files or running code."
)

TOOLS = [
    tools.get_current_time,
    tools.get_random_number,
    tools.count_words,
    tools.calculate,
    code_tools.list_files,
    code_tools.read_file,
    code_tools.write_file,
    code_tools.append_file,
    code_tools.edit_file,
    code_tools.run_command,
]


def build_model(model_name: str, api_key: str) -> ChatOpenRouter:
    return ChatOpenRouter(
        model=model_name,
        api_key=api_key,
        streaming=True,
        temperature=0.7,
        app_title="Console AI Chat",
    )


def build_agent(api_key: str, model_name: str):
    model = build_model(model_name, api_key)
    return create_agent(model=model, tools=TOOLS, system_prompt=SYSTEM_PROMPT)


def load_api_key() -> str:
    load_dotenv()
    key = os.getenv("OPENROUTER_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        print(
            "Missing OPENROUTER_API_KEY.\n"
            "Create a .env file:\n"
            "  cp .env.example .env\n"
            "or export OPENROUTER_API_KEY=sk-or-..."
        )
        sys.exit(1)
    return key


def chunk_text(chunk: AIMessageChunk) -> str:
    content = chunk.content
    if isinstance(content, str):
        return content
    return "".join(block.get("text", "") for block in content if isinstance(block, dict))


def message_text(message: AnyMessage) -> str:
    content = message.content
    if isinstance(content, str):
        return content
    return "".join(block.get("text", "") for block in content if isinstance(block, dict))


def stream_turn(agent, history: list) -> AIMessage:
    full: AIMessageChunk | None = None
    last_ai: AIMessage | None = None

    for chunk in agent.stream(
        {"messages": history},
        stream_mode=["messages", "updates"],
        version="v2",
    ):
        if chunk["type"] == "messages":
            token, _meta = chunk["data"]
            if not isinstance(token, AIMessageChunk):
                continue
            text = chunk_text(token)
            if text:
                print(text, end="", flush=True)
            full = token if full is None else full + token
            if token.chunk_position == "last" and full is not None:
                if full.tool_calls:
                    for call in full.tool_calls:
                        print(f"\n  [tool {call['name']}] {call.get('args', '')}", flush=True)
                full = None
        elif chunk["type"] == "updates":
            for source, update in chunk["data"].items():
                for message in update.get("messages", []):
                    if isinstance(message, AIMessage):
                        last_ai = message
                    if isinstance(message, ToolMessage):
                        name = getattr(message, "name", "") or ""
                        print(f"\n  [tool {name} result] {message_text(message)[:200]}", flush=True)

    print()
    if last_ai is None and full is not None:
        last_ai = full.__class__(content=chunk_text(full)) if isinstance(full, AIMessageChunk) else AIMessage(content=chunk_text(full))
    return last_ai or AIMessage(content="")


def main() -> None:
    api_key = load_api_key()
    model_name = os.getenv("MODEL", "openai/gpt-4o-mini")
    agent = build_agent(api_key, model_name)

    history: list[AIMessage | HumanMessage] = []

    print(f"Console AI chat - agent: {model_name}  (tools: {', '.join(t.name for t in TOOLS)})\n")
    print("Commands: /quit  /clear  /model <name>\n")

    while True:
        try:
            user_input = input("you> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not user_input:
            continue
        if user_input.lower() in {"/quit", "/exit", "/q"}:
            break
        if user_input.lower() == "/clear":
            history = []
            print("(history cleared)\n")
            continue
        if user_input.lower().startswith("/model "):
            model_name = user_input.split(maxsplit=1)[1]
            agent = build_agent(api_key, model_name)
            print(f"(switched to {model_name})\n")
            continue

        history.append(HumanMessage(content=user_input))

        print("ai> ", end="", flush=True)
        try:
            reply = stream_turn(agent, history)
        except Exception as err:
            print(f"\n[error] {err}")
            history.pop()
            continue

        history.append(reply)


if __name__ == "__main__":
    main()