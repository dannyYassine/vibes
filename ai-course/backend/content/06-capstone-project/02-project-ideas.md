---
title: "Choose Your Own Idea"
description: "How to select a good capstone project idea and validate it quickly"
duration_minutes: 12
order: 2
---

## The Best Project is One You Care About

The most common capstone mistake is choosing an impressive-sounding project that you have no personal connection to. Projects with real motivation — a problem you face, a domain you love, a tool you wish existed — consistently produce better results.

Before choosing your project, ask:
- **Who uses this?** Can you name 3 people who would benefit?
- **Why now?** Why is this worth building with LLMs specifically?
- **What does success look like?** Can you describe a working demo in one sentence?

## Idea Generation Framework

### Start with Pain Points

List 5 repetitive, information-heavy tasks you do regularly:

```
Examples:
- Reading and summarizing meeting notes
- Searching through old Slack threads for context
- Answering the same questions over and over for new teammates
- Reviewing pull requests for common issues
- Translating business requirements into technical specifications
```

Any of these could be a capstone project.

### The "What if AI could..." Template

Complete these sentences:
- "What if AI could automatically ___ so I don't have to ___?"
- "What if an expert in ___ was always available to answer ___?"
- "What if I could search my ___ using natural language?"

### Look at API Capabilities

Browse the capabilities of the APIs you've used in this course:
- OpenAI: vision, audio transcription, code interpretation
- Anthropic: large context windows, computer use
- Open-source: fine-tunable models, local inference

What new products become possible?

## Idea Validation

Before committing, validate your idea takes 2 hours, not 2 weeks:

### Quick Prototype Test

```python
# Can you build the core value in 50 lines?
import openai

client = openai.OpenAI()

def minimal_prototype(user_input: str) -> str:
    """Does the core idea work at all?"""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Your specialized system prompt here"},
            {"role": "user", "content": user_input}
        ]
    )
    return response.choices[0].message.content

# Test with your 3 most important use cases
test_cases = [
    "Your first real test case",
    "Your second real test case",
    "Your most important test case",
]

for test in test_cases:
    result = minimal_prototype(test)
    print(f"Input: {test}")
    print(f"Output: {result}\n")
```

If the minimal prototype doesn't produce useful output even with hand-crafted prompts, the idea needs refinement.

### Scope Check

Rate your idea on these dimensions:

| Dimension | Score 1-5 | Notes |
|-----------|-----------|-------|
| Technical complexity | ? | Is this achievable in 5 weeks? |
| Personal interest | ? | Will you stay motivated? |
| Real user value | ? | Would someone actually use this? |
| Course technique fit | ? | Does it use RAG/agents/reasoning? |
| Demo-ability | ? | Can you show it in 5 minutes? |

Target: total score ≥ 18, with personal interest ≥ 4.

## Concrete Project Ideas

Here are 15 specific project ideas with clear scopes:

### Beginner-Friendly (1 advanced technique)

1. **Meeting Summarizer**: Upload a meeting transcript, get structured summary + action items + follow-up questions
2. **Doc Chatbot**: Chat with your own documentation (markdown files or PDFs)
3. **Code Explainer**: Paste code, get plain-English explanations at different expertise levels
4. **Interview Prep Bot**: Ask it to interview you for a software role, get feedback

### Intermediate (2 techniques)

5. **Research Assistant**: Enter a topic, it searches arxiv, reads papers, writes a literature review
6. **Bug Hunter**: Upload a codebase, describe a bug symptom, agent explores and diagnoses
7. **PR Reviewer**: Push a GitHub PR URL, get a detailed code review with suggestions
8. **Study Partner**: Upload course notes, it generates practice questions, evaluates your answers

### Advanced (novel integration)

9. **Competitive Intelligence Bot**: Monitor competitor releases/announcements, daily digest
10. **Data Analysis Agent**: Upload CSV data, ask questions, get charts and statistical insights
11. **On-call Assistant**: Log file analysis agent that suggests root causes for production incidents
12. **Sales Intelligence**: Company research agent for sales prospecting

## Scoping Your Project

The biggest risk is **scope creep**. Define your MVP clearly:

```markdown
## My Project: [Name]

### One-line description
[What it does in one sentence]

### Target user
[Specific person with specific problem]

### MVP features (must have for demo)
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

### Nice-to-have (skip if time is short)
- [Feature A]
- [Feature B]

### Success metric
A user can [specific task] in under [time] with [quality threshold]
```

## Key Takeaways

- Choose a project you personally care about — motivation compounds
- Validate the core idea in 2 hours before committing 5 weeks
- Narrow scope ruthlessly: one thing done excellently beats five things done poorly
- Your demo should be explainable in one sentence and showable in 5 minutes
- The best projects solve a real problem, not a hypothetical one
