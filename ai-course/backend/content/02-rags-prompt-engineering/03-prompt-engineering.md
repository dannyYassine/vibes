---
title: "Prompt Engineering"
description: "Techniques for getting better outputs from LLMs through careful input design"
duration_minutes: 18
order: 3
---

## The Art and Science of Prompting

Prompt engineering is the practice of designing inputs to LLMs to elicit desired outputs. It requires no training and can dramatically improve model performance across tasks.

## Zero-Shot Prompting

No examples — just an instruction:

```python
prompt = "Classify the sentiment of this review as POSITIVE, NEGATIVE, or NEUTRAL:\n\nReview: The battery life is disappointing but the screen is gorgeous."
# → NEGATIVE (or MIXED depending on model)
```

Works well for models with strong instruction-following (GPT-4, Claude). May fail on weaker models or unusual tasks.

## Few-Shot Prompting

Provide 2-5 examples before your actual query:

```python
prompt = """Classify sentiment as POSITIVE, NEGATIVE, or NEUTRAL.

Review: Best laptop I've ever owned. → POSITIVE
Review: Broke after one week. → NEGATIVE
Review: Decent, nothing special. → NEUTRAL
Review: Fast shipping but wrong color. →
"""
# → NEGATIVE
```

Few-shot examples act as an implicit format and reasoning specification. Choose diverse, representative examples.

## Chain-of-Thought (CoT) Prompting

Encourage step-by-step reasoning before the final answer:

```python
# Zero-shot CoT
prompt = """A store sells apples for $1.50 each and oranges for $2.00 each.
If John buys 3 apples and 2 oranges, how much does he spend?

Let's think step by step."""

# →
# Step 1: Cost of apples = 3 × $1.50 = $4.50
# Step 2: Cost of oranges = 2 × $2.00 = $4.00
# Step 3: Total = $4.50 + $4.00 = $8.50
# John spends $8.50

# Few-shot CoT
prompt = """Q: Roger has 5 tennis balls. He buys 2 more cans of 3 balls each. How many does he have?
A: Roger starts with 5. 2 cans × 3 balls = 6 new balls. 5 + 6 = 11. Answer: 11.

Q: A juggler has 16 balls. Half are golf balls. Half of the golf balls are blue. How many blue golf balls?
A: """
```

## Role / Persona Prompting

Assign a role to shape tone and expertise:

```python
system_prompt = """You are an experienced senior software engineer at a top tech company.
You give honest, direct code reviews that focus on:
- Correctness and edge cases
- Performance implications
- Maintainability
You use code examples in your feedback."""

# The model will reason from this perspective
```

## Structured Output Prompting

Force specific output formats for programmatic parsing:

```python
prompt = """Extract the key information from this job posting as JSON.

Job: Senior ML Engineer at Acme Corp. Must have 5+ years ML experience,
Python expertise, and experience with distributed training. $180K-$220K.
Remote OK. Apply by March 1st.

Return JSON with fields: company, title, min_years_experience,
required_skills (list), salary_range, remote, deadline."""

# Reliable JSON output requires:
# 1. Clear field names in prompt
# 2. Example JSON structure (for complex schemas)
# 3. response_format={"type": "json_object"} in OpenAI API
```

```python
# OpenAI structured outputs (most reliable)
from openai import OpenAI
from pydantic import BaseModel

class JobInfo(BaseModel):
    company: str
    title: str
    min_years_experience: int
    required_skills: list[str]
    salary_min: int
    salary_max: int
    remote: bool

client = OpenAI()
response = client.beta.chat.completions.parse(
    model="gpt-4o-2024-08-06",
    messages=[{"role": "user", "content": prompt}],
    response_format=JobInfo,
)
job = response.choices[0].message.parsed
```

## Prompt Templates

Separate prompt structure from runtime variables:

```python
from string import Template

SUMMARIZE_TEMPLATE = Template("""
You are a concise technical writer. Summarize the following $doc_type in $max_sentences sentences or fewer.
Focus on: $focus_areas

Content to summarize:
$content

Summary:""")

summary_prompt = SUMMARIZE_TEMPLATE.substitute(
    doc_type="research paper",
    max_sentences=3,
    focus_areas="key findings, methods, and implications",
    content=paper_text,
)
```

## Common Anti-Patterns

### The Vague Instruction

```python
# BAD: Ambiguous
"Improve this text."

# GOOD: Specific
"Rewrite this text to be more concise. Reduce length by 30%.
Keep all key facts. Use active voice. Target audience: technical managers."
```

### The Overloaded Prompt

```python
# BAD: Too many things at once
"Analyze this code and fix bugs and add tests and refactor for readability..."

# GOOD: Decompose into steps
prompts = [
    "Identify all bugs in this code. List each bug with its line number.",
    "Fix the bugs you identified. Show only the changed sections.",
    "Write unit tests covering the main cases.",
]
```

### Not Specifying Format

```python
# BAD: Model may return prose
"What are the pros and cons of microservices?"

# GOOD: Format specified
"List exactly 3 pros and 3 cons of microservices.
Format as a markdown table with columns: Category, Point, Impact (High/Medium/Low)"
```

## Key Takeaways

- Start with zero-shot; add examples if the model struggles with format or reasoning
- "Let's think step by step" reliably improves arithmetic and logical reasoning
- Role prompting shapes tone and expertise perspective
- Structured output prompting + Pydantic models enables reliable data extraction
- Decompose complex multi-step tasks rather than cramming everything into one prompt
