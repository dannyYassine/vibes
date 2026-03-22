---
title: "Chatbots' Overall Design"
description: "End-to-end architecture of production chatbot systems built on LLMs"
duration_minutes: 18
order: 10
---

## The Production Chatbot Stack

Building a chatbot that reliably serves millions of users requires more than a fine-tuned LLM. You need a complete system with context management, safety layers, observability, and scalable inference.

```
User → API Gateway → Safety Pre-filter
    → Context Manager → Prompt Builder
    → LLM Inference → Safety Post-filter
    → Response Formatter → User
              ↕
         Memory Store
         Tool Executor
         Observability
```

## Context Management

LLMs have a fixed context window (e.g., 128K tokens for GPT-4o). A multi-turn conversation must fit within this window.

### Sliding Window

Keep the most recent N turns, dropping older ones:

```python
class ConversationContext:
    def __init__(self, max_tokens=16000):
        self.messages = []
        self.max_tokens = max_tokens
        self.tokenizer = get_tokenizer()

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        self._trim_to_limit()

    def _trim_to_limit(self):
        while self._count_tokens() > self.max_tokens:
            # Remove oldest non-system message
            for i, msg in enumerate(self.messages):
                if msg["role"] != "system":
                    self.messages.pop(i)
                    break

    def _count_tokens(self) -> int:
        return sum(
            len(self.tokenizer.encode(m["content"]))
            for m in self.messages
        )
```

### Summarization

For long conversations, summarize old turns instead of dropping them:

```python
async def compress_conversation(messages: list, llm) -> list:
    if len(messages) <= 10:
        return messages

    # Summarize oldest turns
    old_messages = messages[:-6]
    summary_prompt = f"""Summarize this conversation in 2-3 sentences:
{format_messages(old_messages)}"""

    summary = await llm.complete(summary_prompt)

    return [
        {"role": "system", "content": f"Previous conversation summary: {summary}"},
        *messages[-6:]
    ]
```

## System Prompts

The system prompt defines the chatbot's persona, capabilities, and constraints. Good system prompts are:

1. **Clear about identity**: What is this assistant?
2. **Specific about capabilities**: What can it help with?
3. **Clear about limitations**: What should it refuse?
4. **Consistent in tone**: Professional, friendly, technical?

```python
SYSTEM_PROMPT = """You are a helpful assistant for ByteByteGo, specializing in software engineering and system design.

You help users:
- Understand system design concepts and tradeoffs
- Prepare for technical interviews
- Explore distributed systems, databases, and APIs

Guidelines:
- Be concise and precise
- Use code examples when helpful
- When uncertain, say so and suggest authoritative resources
- Do not discuss topics outside software engineering

Today's date: {date}"""
```

## Retrieval-Augmented Generation (RAG)

Inject relevant documents into the context to give the LLM access to up-to-date or proprietary information:

```python
async def rag_pipeline(query: str, llm, vector_store) -> str:
    # Retrieve relevant chunks
    relevant_docs = await vector_store.search(
        query=query,
        top_k=5,
        score_threshold=0.7
    )

    # Build augmented prompt
    context = "\n\n".join([doc.content for doc in relevant_docs])

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"""Answer based on the context below.

Context:
{context}

Question: {query}"""}
    ]

    return await llm.chat(messages)
```

## Tool Use and Function Calling

Modern LLMs can call external tools (APIs, databases, calculators):

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for current information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        }
    }
]

response = await openai_client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

# Handle tool calls
if response.choices[0].message.tool_calls:
    for tool_call in response.choices[0].message.tool_calls:
        if tool_call.function.name == "search_web":
            args = json.loads(tool_call.function.arguments)
            result = await search_web(args["query"])
            # Add result to messages and re-query
```

## Safety Layers

### Input Moderation

Before sending to the LLM, check user input:

```python
async def moderate_input(text: str) -> ModerationResult:
    # OpenAI Moderation API
    result = await openai_client.moderations.create(input=text)
    categories = result.results[0].categories

    if any([
        categories.harassment,
        categories.hate,
        categories.sexual_minors,
        categories.violence_graphic,
    ]):
        raise SafetyException("Input violates content policy")

    return result
```

### Output Validation

After generation, validate the output before sending to users:

```python
async def validate_output(response: str, original_query: str) -> str:
    # Check for PII in response
    if contains_pii(response):
        response = scrub_pii(response)

    # Check for hallucinated code that could be harmful
    if contains_code(response):
        response = safety_check_code(response)

    return response
```

## Observability and Monitoring

Production chatbots need comprehensive logging:

```python
@dataclass
class ChatInteraction:
    request_id: str
    user_id: str
    timestamp: datetime
    input_tokens: int
    output_tokens: int
    latency_ms: float
    model: str
    cost_usd: float
    safety_flagged: bool
    user_rating: Optional[int] = None

async def log_interaction(interaction: ChatInteraction):
    await metrics.record(
        "chat.latency", interaction.latency_ms,
        tags={"model": interaction.model}
    )
    await metrics.record(
        "chat.cost", interaction.cost_usd,
        tags={"user_id": interaction.user_id}
    )
    await db.insert("interactions", dataclasses.asdict(interaction))
```

## Caching for Cost Reduction

Many queries are repeated. Semantic caching matches similar (not just identical) queries:

```python
class SemanticCache:
    def __init__(self, embedding_model, similarity_threshold=0.95):
        self.store = {}
        self.embeddings = {}
        self.embed = embedding_model
        self.threshold = similarity_threshold

    async def get(self, query: str) -> Optional[str]:
        query_embedding = await self.embed(query)
        for cached_query, cached_response in self.store.items():
            cached_embedding = self.embeddings[cached_query]
            similarity = cosine_similarity(query_embedding, cached_embedding)
            if similarity > self.threshold:
                return cached_response
        return None
```

## Key Design Decisions

| Decision | Options | Recommendation |
|---------|---------|----------------|
| Context window | Sliding / Summarize / Vector memory | Summarize for >20 turns |
| Safety | Pre-filter / Post-filter / Both | Both for production |
| Caching | Exact / Semantic / None | Semantic for public APIs |
| Streaming | Yes / No | Yes for conversational UX |
| Rate limiting | Per user / Global / None | Per user in production |

## Key Takeaways

- Production chatbots need context management, safety layers, tools, and observability
- System prompts define persona, capabilities, and constraints — invest time in them
- RAG extends the model's knowledge with retrieved documents
- Safety requires both input moderation and output validation
- Semantic caching can reduce API costs by 30-70% for common queries
- Always log interactions with enough detail for debugging and improvement
