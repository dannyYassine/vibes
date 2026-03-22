---
title: "Demo + Feedback Session"
description: "How to present your capstone project effectively and give/receive useful feedback"
duration_minutes: 15
order: 4
---

## The 5-Minute Demo Formula

The best technical demos follow a simple structure. Practice until you can deliver it in exactly 5 minutes:

### Minute 1: The Problem
- One sentence describing the problem
- Who has this problem and how often?
- Why does it matter now?

**Example**: "Every week, our team spends 3 hours reading through competitor release notes. I built an agent that does this automatically and sends a structured digest."

### Minute 2: The Solution Overview
- What did you build?
- What's the core technical approach?
- One architecture diagram (optional but useful)

### Minutes 3-4: Live Demo
- Start with the most impressive use case
- Show real output, not screenshots
- Demo the edge case or failure mode you're most proud of handling

### Minute 5: Results and What's Next
- Key metrics: how well does it work?
- What would you build next with more time?
- Open questions you'd like feedback on

## Preparing Your Demo Environment

Murphy's Law applies most aggressively during live demos. Prepare:

```bash
# 1. Test your demo script the morning of the presentation
cd your-project
./demo.sh  # Should do everything from scratch

# 2. Have a fallback recording ready
# Screen record a complete demo session as backup

# 3. Check your API keys
python -c "import openai; print(openai.OpenAI().models.list().data[0].id)"

# 4. Pre-generate any slow outputs
# If one query takes 30s, pre-generate it and show the cached result

# 5. Have your README open for architecture questions
```

## Structuring Your Demo

```markdown
## [Project Name] Demo Script

### Setup (30 seconds)
- Open app at localhost:8000
- Show the empty state
- Have test data ready to paste

### Core Demo (3 minutes)
1. Input: [paste your best example input]
2. Show the processing/thinking (if visible)
3. Output: walk through what was generated and why it's good

### Edge Case (1 minute)
- Input: [a tricky case your system handles well]
- Explain why naive approaches would fail here

### Architecture (30 seconds)
- Point to diagram
- "The key technical decision was X because Y"

### Results (30 seconds)
- "In testing, it correctly handled N/M cases"
- "Average response time is X seconds"
```

## How to Give Good Feedback

When reviewing others' projects, be specific and constructive:

### The Feedback Framework

**Describe what you saw**: "When you entered the ambiguous query, the system responded with..."

**Identify the issue clearly**: "The response seemed to ignore the second part of the question."

**Suggest a direction**: "You might try adding explicit parsing for multi-part questions, or using a router to split the query first."

**Ask a question**: "Did you consider using a reranker here? Would that help with this case?"

### Good Feedback Examples

✓ "The system hallucinated the company's founding date in that third example. Have you tried adding a confidence check or asking it to cite its sources?"

✓ "The latency jumped to 8 seconds on the complex query. For production, you might look into response caching or a smaller model for initial classification."

✓ "I loved how it handled the ambiguous query by asking a clarifying question — that's a great UX pattern."

### Feedback to Avoid

✗ "It's not working." (Not actionable — what specifically isn't working?)
✗ "You should use a different model." (Too vague — which model, and why?)
✗ "The UI could be better." (Too general — what specific UX issue did you encounter?)

## Receiving Feedback

Getting critical feedback is a skill:

1. **Take notes**: You can't remember everything, and you're too close to the work
2. **Ask clarifying questions**: "Can you show me exactly what input produced that output?"
3. **Don't defend immediately**: First listen and understand, then discuss
4. **Distinguish signal from noise**: Not all feedback is equally important
5. **Prioritize actionable feedback**: Focus on things you can actually change

```
Good feedback response: "That's a good point about the latency.
I noticed it too on long documents. I think the right fix
would be async chunking — can I follow up with you about
the implementation?"

Poor feedback response: "Well, it works fine for me. The
slow query was just a bad example."
```

## Self-Evaluation Rubric

Before your demo, honestly rate your project:

| Area | 1 (Needs Work) | 3 (Acceptable) | 5 (Excellent) |
|------|----------------|----------------|---------------|
| Core functionality | Crashes/errors | Works for happy path | Handles edge cases well |
| Technical depth | Basic API call | 1 advanced technique | 2+ techniques integrated |
| Code quality | Hard to understand | Readable, some docs | Well-structured, documented |
| Evaluation | "It seems to work" | Tested 10+ cases | Quantitative metrics |
| Presentation | Unclear what it does | Clear demo | Compelling narrative |

## What to Do After the Demo

1. **Fix the top 3 issues** mentioned in feedback
2. **Write up what you learned** — a technical blog post is excellent portfolio content
3. **Share it** — GitHub, Twitter/X, LinkedIn — this is real work worth showing
4. **Keep building** — the best projects started as course projects

## Reflection Questions

Answer these for yourself after the capstone:

- What was the hardest technical problem you solved?
- What would you do differently if you started over?
- Which course technique had the biggest impact?
- What does your project reveal about the current limitations of LLMs?
- How would you scale this to 10,000 users?

## Key Takeaways

- A great demo tells a story: problem → solution → results in 5 minutes
- Prepare your demo environment obsessively — live demos break at the worst moments
- Specific, actionable feedback is a gift — give it and receive it graciously
- The capstone isn't the end — it's the beginning of your AI engineering practice
- Document, share, and keep iterating on your project
