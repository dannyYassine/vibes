"""Four specialist subagents — one narrow toolset each."""

from __future__ import annotations

from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from supervisor_agent.config import LM_STUDIO_URL, MODEL_NAME
from supervisor_agent.tools import fetch_url, glob_files, read_file, ripgrep, str_replace, write_file

llm = ChatOpenAI(
    base_url=LM_STUDIO_URL,
    api_key="lm-studio",  # non-empty, never validated
    model=MODEL_NAME,
    temperature=0,
)

grep_agent = create_react_agent(
    model=llm,
    tools=[ripgrep],
    prompt="You search file contents with ripgrep. Report matches as file:line: content. Be concise.",
)

glob_agent = create_react_agent(
    model=llm,
    tools=[glob_files],
    prompt="You find files by glob pattern. Return paths only, no commentary.",
)

read_agent = create_react_agent(
    model=llm,
    tools=[read_file],
    prompt="You read files from disk. Return the requested content verbatim with line numbers.",
)

write_agent = create_react_agent(
    model=llm,
    tools=[write_file, str_replace],
    prompt="You write and edit files. Prefer str_replace for targeted edits. Report what you changed.",
)

fetch_agent = create_react_agent(
    model=llm,
    tools=[fetch_url],
    prompt="You fetch web pages by URL. Return the content, summarized if too long.",
)
