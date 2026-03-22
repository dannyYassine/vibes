---
title: "Pre-Training: Text Generation"
description: "Sampling strategies, temperature, and how LLMs generate text at inference time"
duration_minutes: 14
order: 6
---

## The Generation Process

After pre-training, an LLM takes a prompt and generates text by repeatedly sampling the next token. Each forward pass produces a probability distribution over the vocabulary; a sampling strategy picks one token from that distribution.

```python
def generate(model, tokenizer, prompt, max_new_tokens=200, **sampling_kwargs):
    input_ids = tokenizer.encode(prompt, return_tensors="pt")

    for _ in range(max_new_tokens):
        with torch.no_grad():
            outputs = model(input_ids)
            logits = outputs.logits[:, -1, :]  # Last token's logits

        next_token_id = sample(logits, **sampling_kwargs)
        input_ids = torch.cat([input_ids, next_token_id.unsqueeze(0)], dim=1)

        if next_token_id == tokenizer.eos_token_id:
            break

    return tokenizer.decode(input_ids[0])
```

## Sampling Strategies

### Greedy Decoding

Always pick the highest-probability token:

```python
def greedy_sample(logits):
    return logits.argmax(dim=-1)
```

**Problem**: Deterministic and often repetitive. Greedy decoding gets stuck in loops because the most probable continuation of a repeated phrase is often more of the same phrase.

### Temperature Scaling

Temperature controls the "sharpness" of the probability distribution:

```python
def temperature_sample(logits, temperature=1.0):
    scaled_logits = logits / temperature
    probs = F.softmax(scaled_logits, dim=-1)
    return torch.multinomial(probs, num_samples=1)
```

- `temperature = 1.0`: Unmodified distribution
- `temperature < 1.0` (e.g., 0.3): Sharper distribution, more focused/deterministic
- `temperature > 1.0` (e.g., 1.5): Flatter distribution, more random/creative
- `temperature → 0`: Approaches greedy decoding
- `temperature → ∞`: Approaches uniform random sampling

```
Original probs: [0.5, 0.3, 0.15, 0.05]

T=0.5 (sharper): [0.78, 0.18, 0.04, 0.00]  ← confident
T=1.0 (normal):  [0.50, 0.30, 0.15, 0.05]  ← original
T=2.0 (flatter): [0.36, 0.31, 0.24, 0.09]  ← diverse
```

### Top-K Sampling

Restrict sampling to the K most probable tokens:

```python
def top_k_sample(logits, k=50):
    top_k_logits, top_k_indices = torch.topk(logits, k)
    probs = F.softmax(top_k_logits, dim=-1)
    sampled_idx = torch.multinomial(probs, num_samples=1)
    return top_k_indices[sampled_idx]
```

**Problem**: K is context-insensitive. When the model is very confident (one token has 99% probability), K=50 still allows 49 low-probability alternatives. When uncertain (many equal options), K=50 may be too restrictive.

### Nucleus (Top-P) Sampling

Sample from the smallest set of tokens whose cumulative probability exceeds P:

```python
def top_p_sample(logits, p=0.9):
    sorted_logits, sorted_indices = torch.sort(logits, descending=True)
    probs = F.softmax(sorted_logits, dim=-1)
    cumulative_probs = torch.cumsum(probs, dim=-1)

    # Remove tokens beyond the nucleus
    sorted_indices_to_remove = cumulative_probs - probs > p
    sorted_logits[sorted_indices_to_remove] = float('-inf')

    filtered_logits = sorted_logits.scatter(0, sorted_indices, sorted_logits)
    return torch.multinomial(F.softmax(filtered_logits, dim=-1), num_samples=1)
```

When the model is confident, the nucleus is small (few tokens). When uncertain, the nucleus is large (many tokens). This adapts automatically to context.

### Min-P Sampling

A newer approach: keep only tokens with probability > `min_p × max_prob`:

```python
def min_p_sample(logits, min_p=0.05):
    probs = F.softmax(logits, dim=-1)
    max_prob = probs.max()
    threshold = min_p * max_prob
    # Zero out tokens below threshold
    filtered_probs = probs.masked_fill(probs < threshold, 0)
    filtered_probs /= filtered_probs.sum()
    return torch.multinomial(filtered_probs, num_samples=1)
```

## Combining Strategies

Production systems typically combine temperature + top-p (and sometimes top-k):

```python
def generate_with_params(
    model, tokenizer, prompt,
    temperature=0.7,
    top_p=0.9,
    top_k=0,          # 0 means disabled
    max_new_tokens=500,
    repetition_penalty=1.1,
):
    ...
```

Common production settings:
- **Factual tasks** (Q&A, summarization): temperature=0.1-0.3, top_p=0.9
- **Creative tasks** (story writing): temperature=0.8-1.0, top_p=0.95
- **Code generation**: temperature=0.2-0.4, top_p=0.95

## Repetition Penalty

Models can get stuck in repetitive loops. A repetition penalty discounts tokens that have already appeared:

```python
def apply_repetition_penalty(logits, input_ids, penalty=1.1):
    for token_id in set(input_ids.tolist()):
        if logits[token_id] > 0:
            logits[token_id] /= penalty
        else:
            logits[token_id] *= penalty
    return logits
```

## Beam Search

Instead of sampling one token at a time, beam search maintains K candidate sequences (beams) and picks the one with the highest overall probability:

```python
# Beam search pseudocode
beams = [(initial_input, 0.0)]  # (tokens, log_prob)

for step in range(max_new_tokens):
    candidates = []
    for tokens, score in beams:
        logits = model(tokens)
        top_tokens = logits.topk(beam_width)
        for token, log_p in zip(top_tokens.indices, top_tokens.values):
            candidates.append((tokens + [token], score + log_p))

    # Keep top-k by score
    beams = sorted(candidates, key=lambda x: x[1])[-beam_width:]
```

Beam search produces higher-quality, more coherent text but is 5-10× slower and can produce repetitive, "safe" outputs for creative tasks.

## Speculative Decoding

A technique to speed up inference using a small draft model:

1. Draft model generates K tokens quickly
2. Target (large) model evaluates all K tokens in one forward pass
3. Accept tokens up to the first disagreement, then resample

This achieves the output quality of the large model at near-small-model speed.

## Key Takeaways

- Autoregressive generation samples one token at a time from the model's output distribution
- Temperature controls randomness: lower = more deterministic, higher = more creative
- Top-p (nucleus) sampling adapts the candidate set size to the model's confidence
- Combining temperature + top-p is the standard production approach
- Beam search is slower but better for translation; sampling is preferred for chat and creative tasks
- Repetition penalty prevents repetitive loops; speculative decoding speeds up inference
