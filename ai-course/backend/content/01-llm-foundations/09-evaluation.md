---
title: "Evaluation"
description: "Benchmarks, metrics, and best practices for evaluating LLM performance"
duration_minutes: 15
order: 9
---

## The Evaluation Challenge

Evaluating LLMs is notoriously hard. Unlike classification tasks with clear right/wrong answers, most LLM outputs require subjective quality judgments. A response can be factually correct but poorly explained, or beautifully written but subtly wrong.

The field has settled on a mix of approaches: standardized benchmarks for reproducibility, human evaluation for ground truth, and LLM-as-judge for scale.

## Benchmark Categories

### Knowledge and Reasoning Benchmarks

**MMLU (Massive Multitask Language Understanding)**
- 57 subjects across STEM, humanities, law, medicine
- Multiple choice questions from professional/academic exams
- Measures breadth of knowledge

```python
# Example MMLU question
question = {
    "question": "A 45-year-old woman presents with chest pain...",
    "choices": ["A. Pneumonia", "B. Pulmonary embolism", "C. Aortic dissection", "D. GERD"],
    "answer": "B"
}
# Evaluated as: does the model predict the correct letter?
```

**BIG-Bench Hard (BBH)**
- 23 challenging tasks requiring multi-step reasoning
- Tasks designed to be hard for LLMs specifically
- Includes logical deduction, causal reasoning, algorithmic tasks

### Code Benchmarks

**HumanEval**
- 164 Python programming problems
- Each has a docstring, function signature, and test cases
- Evaluated with `pass@k`: does any of k samples pass all tests?

```python
# HumanEval problem example
def has_close_elements(numbers: List[float], threshold: float) -> bool:
    """Check if any two numbers in the list are closer than threshold.
    >>> has_close_elements([1.0, 2.0, 3.0], 0.5)
    False
    >>> has_close_elements([1.0, 2.8, 3.0, 4.0, 5.0, 2.0], 0.3)
    True
    """
    # Model must generate the function body
```

**MBPP (Mostly Basic Python Problems)**
- 374 entry-level programming problems
- More diverse than HumanEval

### Math Benchmarks

**GSM8K**
- 8,500 grade-school math problems
- Tests multi-step arithmetic reasoning
- Solution requires showing work (chain-of-thought)

**MATH**
- 12,500 competition math problems (AMC, AIME)
- 5 difficulty levels
- Tests advanced mathematical reasoning

### Instruction Following

**MT-Bench**
- 80 multi-turn questions across 8 categories
- GPT-4 rates responses 1-10
- Captures conversational ability, not just single-turn

**AlpacaEval**
- 805 instructions from diverse datasets
- Win rate against reference model (GPT-4-turbo)
- Normalized for length bias (AlpacaEval 2.0)

### Safety Benchmarks

**TruthfulQA**
- 817 questions that humans often answer incorrectly due to misconceptions
- Tests whether models are truthful vs. repeating false beliefs

**BBQ (Bias Benchmark for QA)**
- Tests for social bias across 9 demographic categories
- Ambiguous contexts where biased models give wrong answers

## LLM-as-Judge

Using a strong LLM (GPT-4, Claude) to evaluate another model's outputs:

```python
def llm_judge(prompt, response, judge_model="gpt-4"):
    judge_prompt = f"""You are an expert evaluator. Rate the following response.

Question: {prompt}
Response: {response}

Rate the response on:
1. Accuracy (1-10): Is the information correct?
2. Helpfulness (1-10): Does it answer the question well?
3. Clarity (1-10): Is it well-written and easy to understand?

Provide a score for each and a brief justification."""

    result = judge_model.complete(judge_prompt)
    return parse_scores(result)
```

**Advantages**: Scalable, consistent, multi-dimensional
**Disadvantages**: Expensive, biased toward models with similar style to the judge, not reproducible without version pinning

## Human Evaluation

The gold standard for final model comparisons.

### Side-by-Side Evaluation

Show annotators two responses (A and B, blinded) and ask: which is better?

```
Prompt: "Explain quantum entanglement"

Response A: [Model 1 output]
Response B: [Model 2 output]

☐ A is much better  ☐ A is slightly better  ☐ Tie  ☐ B is slightly better  ☐ B is much better
```

### Absolute Rating

Rate each response independently on a Likert scale (1-5):
- 5: Excellent, would not change anything
- 4: Good, minor improvements possible
- 3: Adequate, some issues
- 2: Poor, significant issues
- 1: Very poor, fails at the task

## Evaluation Pitfalls

### Benchmark Contamination

If training data contains test questions, benchmark scores are inflated:
- Check for overlap between training data and benchmarks
- Use held-out test sets not released until evaluation
- Rotate benchmarks regularly

### Evaluation on Benchmarks vs. Real Tasks

MMLU measures knowledge recall, not ability to solve real problems. A model can score 90% on MMLU and still produce unhelpful responses in practice.

Always complement benchmark evaluation with:
- Task-specific evaluations matching your use case
- User studies on real users with real tasks
- Red-teaming for safety-critical applications

### Length Bias

Longer responses often score higher with both human raters and LLM judges, even when conciseness is better. Control for length explicitly.

## Evaluation Best Practices

1. **Use multiple benchmarks** across different capability dimensions
2. **Report confidence intervals** — single-run scores are noisy
3. **Pin judge model versions** — GPT-4 behavior changes over time
4. **Separate capability from alignment** — safety and capability are different axes
5. **Evaluate on your actual distribution** — in-distribution evaluation matters most

## Key Takeaways

- No single benchmark captures all aspects of LLM quality
- MMLU, HumanEval, GSM8K, and MT-Bench are the most commonly reported benchmarks
- LLM-as-judge scales well but has biases toward the judge's style
- Human evaluation is the gold standard but expensive
- Benchmark contamination is a serious concern — test sets should be held out
- Always evaluate on your actual use case, not just standardized benchmarks
