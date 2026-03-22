---
title: "Workflows: Routing"
description: "Directing queries to specialized models or prompts based on intent classification"
duration_minutes: 12
order: 3
---

## What Is Routing?

Routing is the pattern of classifying an incoming request and directing it to the most appropriate handler — whether that is a specialized prompt, a different LLM model, or an entirely different pipeline. Think of it as a smart dispatcher that sits in front of your AI system.

Good routing improves quality (specialized prompts outperform generalist ones), reduces cost (simple queries go to cheap models), and improves latency (fast models for simple tasks). It is one of the highest-leverage patterns in production LLM systems.

```
User Query
    |
    v
 Router ─── classify ───> Technical Support -> GPT-4o + tech system prompt
    |
    +───────────────────> Billing Question  -> GPT-4o-mini + billing prompt
    |
    └───────────────────> General Chat      -> GPT-4o-mini + general prompt
```

## LLM-Based Routing

The simplest approach: use a fast, cheap model to classify the intent of the incoming request, then route based on that classification.

```python
from openai import OpenAI
from pydantic import BaseModel
from typing import Literal

client = OpenAI()

class RouteDecision(BaseModel):
    route: Literal["technical", "billing", "general", "escalate"]
    confidence: float
    reasoning: str

def classify_intent(user_message: str) -> RouteDecision:
    """Use a small, fast model to classify intent."""
    response = client.beta.chat.completions.parse(
        model="gpt-4o-mini",  # Cheap and fast for classification
        messages=[
            {
                "role": "system",
                "content": """Classify the user's intent into one of these categories:
- technical: coding, debugging, architecture, APIs, databases
- billing: payments, subscriptions, invoices, refunds
- general: everything else
- escalate: angry customer, legal threats, urgent issues

Return your classification with confidence (0-1) and brief reasoning.""",
            },
            {"role": "user", "content": user_message},
        ],
        response_format=RouteDecision,
    )
    return response.choices[0].message.parsed

ROUTE_CONFIGS = {
    "technical": {
        "model": "gpt-4o",
        "system": "You are a senior software engineer. Provide precise technical answers with code examples.",
    },
    "billing": {
        "model": "gpt-4o-mini",
        "system": "You are a billing support specialist. Be helpful, accurate, and empathetic.",
    },
    "general": {
        "model": "gpt-4o-mini",
        "system": "You are a helpful customer support assistant.",
    },
    "escalate": {
        "model": "gpt-4o",
        "system": "You are a senior support manager. Handle this situation with care and urgency.",
    },
}

def handle_request(user_message: str) -> str:
    decision = classify_intent(user_message)
    config = ROUTE_CONFIGS[decision.route]

    print(f"Routing to: {decision.route} (confidence: {decision.confidence:.2f})")

    response = client.chat.completions.create(
        model=config["model"],
        messages=[
            {"role": "system", "content": config["system"]},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content

answer = handle_request("My PostgreSQL query is running for 45 seconds, help me optimize it")
# Routes to: technical (confidence: 0.97)
```

## Classifier-Based Routing

For high-throughput production systems, a trained classifier (not an LLM) handles routing at millisecond latency and negligible cost per request.

```python
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import numpy as np

training_data = [
    ("How do I fix a segfault in my C code?", "technical"),
    ("My API keeps returning 429 errors", "technical"),
    ("I was charged twice last month", "billing"),
    ("How do I cancel my subscription?", "billing"),
    ("What are your business hours?", "general"),
    ("Can you help me understand your pricing?", "general"),
]

texts, labels = zip(*training_data)

classifier = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=10000)),
    ("clf", LogisticRegression(max_iter=1000)),
])
classifier.fit(texts, labels)

def route_with_classifier(user_message: str) -> tuple[str, float]:
    probabilities = classifier.predict_proba([user_message])[0]
    classes = classifier.classes_
    best_idx = np.argmax(probabilities)
    route = classes[best_idx]
    confidence = probabilities[best_idx]

    # Fall back to LLM router if confidence is low
    if confidence < 0.7:
        decision = classify_intent(user_message)
        return decision.route, decision.confidence

    return route, confidence

route, conf = route_with_classifier("My invoice shows the wrong amount")
print(f"Route: {route}, Confidence: {conf:.2f}")
```

## Rule-Based Routing

Sometimes the simplest approach is the most reliable. Keyword matching, regex patterns, or metadata from the request can deterministically route without any model call.

```python
import re
from dataclasses import dataclass
from typing import Callable

@dataclass
class RoutingRule:
    name: str
    condition: Callable[[str], bool]
    route: str
    priority: int  # Lower number = higher priority

ROUTING_RULES = [
    RoutingRule(
        name="code_block",
        condition=lambda msg: "```" in msg or "def " in msg or "class " in msg,
        route="technical",
        priority=1,
    ),
    RoutingRule(
        name="billing_keywords",
        condition=lambda msg: bool(re.search(
            r"\b(invoice|payment|charge|refund|subscription|billing|cancel)\b",
            msg, re.IGNORECASE
        )),
        route="billing",
        priority=2,
    ),
    RoutingRule(
        name="urgent",
        condition=lambda msg: bool(re.search(
            r"\b(urgent|asap|immediately|broken|down|outage)\b",
            msg, re.IGNORECASE
        )),
        route="escalate",
        priority=1,
    ),
]

def rule_based_route(user_message: str) -> str:
    sorted_rules = sorted(ROUTING_RULES, key=lambda r: r.priority)
    for rule in sorted_rules:
        if rule.condition(user_message):
            return rule.route
    return "general"  # Default route
```

## Multi-Model Routing: Cheap vs Expensive

One of the highest-value routing strategies is routing based on query complexity to optimize cost without sacrificing quality.

```python
from pydantic import BaseModel
from typing import Literal

class ComplexityAssessment(BaseModel):
    complexity: Literal["simple", "moderate", "complex"]
    requires_reasoning: bool
    requires_code: bool

def assess_complexity(query: str) -> ComplexityAssessment:
    response = client.beta.chat.completions.parse(
        model="gpt-4o-mini",  # Always use cheap model for routing
        messages=[
            {"role": "system", "content":
             "Assess the complexity of answering this query. "
             "Simple: factual lookup or single-step task. "
             "Moderate: multi-step but straightforward. "
             "Complex: requires deep reasoning, large code, or creative work."},
            {"role": "user", "content": query},
        ],
        response_format=ComplexityAssessment,
    )
    return response.choices[0].message.parsed

def smart_route(query: str) -> str:
    assessment = assess_complexity(query)

    if assessment.complexity == "simple":
        model = "gpt-4o-mini"      # ~$0.15/1M tokens
    elif assessment.complexity == "moderate":
        model = "gpt-4o-mini"
    else:
        model = "gpt-4o"           # ~$2.50/1M tokens — use sparingly

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": query}],
    )

    print(f"Used model: {model} (complexity: {assessment.complexity})")
    return response.choices[0].message.content

# Simple question -> gpt-4o-mini (saves ~94% cost)
smart_route("What is the capital of France?")

# Complex task -> gpt-4o (quality where it matters)
smart_route("Design a distributed rate limiting system for 100k req/sec")
```

## Combining Routing Strategies

Production systems often layer multiple routing strategies: rule-based first (zero cost, zero latency), then classifier (low cost, very low latency), then LLM-based for edge cases.

```python
def production_router(user_message: str, user_tier: str = "standard") -> dict:
    """Multi-layer routing with fallbacks."""

    # Layer 1: Rule-based (instant, free)
    rule_route = rule_based_route(user_message)
    if rule_route != "general":
        return {"route": rule_route, "method": "rules", "model": "gpt-4o-mini"}

    # Layer 2: Classifier (fast, cheap)
    clf_route, confidence = route_with_classifier(user_message)
    if confidence >= 0.85:
        return {"route": clf_route, "method": "classifier", "model": "gpt-4o-mini"}

    # Layer 3: LLM classifier (slower, slightly more expensive)
    llm_route = classify_intent(user_message)
    model = "gpt-4o" if user_tier == "enterprise" else "gpt-4o-mini"
    return {"route": llm_route.route, "method": "llm", "model": model}
```

## Key Takeaways

- Routing classifies incoming queries and directs them to specialized handlers, improving quality and reducing cost.
- LLM-based routing is flexible but costs a model call per request — use a small, fast model like gpt-4o-mini.
- Classifier-based routing is best for high-throughput systems where you have labeled training data.
- Rule-based routing is deterministic, free, and fast — always try it first for obvious patterns.
- Multi-model routing (cheap vs expensive) is one of the highest-ROI optimizations in production LLM systems.
- Layer routing strategies: rules first, classifier second, LLM last.
