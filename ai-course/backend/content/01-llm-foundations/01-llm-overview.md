---
title: "LLM Overview and Foundations"
description: "A high-level survey of large language models, their capabilities, and the landscape"
duration_minutes: 15
order: 1
---

## What is a Large Language Model?

A large language model (LLM) is a neural network trained on vast amounts of text data to predict and generate human-like text. At its core, an LLM learns statistical patterns in language — which words and concepts tend to follow others — and uses those patterns to complete text prompts.

The defining characteristics of modern LLMs:

- **Scale**: Billions to trillions of parameters
- **Pre-training**: Trained on hundreds of billions of tokens
- **Transfer learning**: A single pre-trained model powers many downstream tasks
- **Emergent abilities**: Capabilities that arise only at sufficient scale (in-context learning, chain-of-thought reasoning)

## The LLM Revolution

The modern LLM era began with the **Transformer architecture** (Vaswani et al., 2017), which replaced recurrent networks with attention mechanisms. This enabled efficient parallel training on GPUs and unlocked scale.

Key milestones:

| Year | Model | Parameters | Key Innovation |
|------|-------|-----------|----------------|
| 2018 | GPT-1 | 117M | Generative pre-training |
| 2019 | GPT-2 | 1.5B | Zero-shot task transfer |
| 2020 | GPT-3 | 175B | Few-shot in-context learning |
| 2022 | ChatGPT | ~175B | RLHF for instruction following |
| 2023 | GPT-4 | ~1T (est) | Multimodal, improved reasoning |
| 2023 | Llama 2 | 7B–70B | Open-weight competitive model |
| 2024 | Llama 3 | 8B–405B | State-of-the-art open weights |

## How LLMs Generate Text

At inference time, an LLM takes a sequence of tokens as input and outputs a probability distribution over its vocabulary for the next token. This process repeats autoregressively:

```python
# Pseudocode for autoregressive generation
prompt_tokens = tokenize("What is the capital of France?")
generated = []

for step in range(max_new_tokens):
    logits = model(prompt_tokens + generated)
    next_token = sample_from(logits[-1])  # last position
    generated.append(next_token)
    if next_token == EOS_TOKEN:
        break

output = detokenize(generated)
# → "The capital of France is Paris."
```

The quality of outputs depends heavily on:
1. **Sampling strategy** — temperature, top-k, top-p (nucleus) sampling
2. **Prompt quality** — how you frame the input
3. **Model size and training** — bigger models trained on more data generally perform better

## LLM Capabilities

Modern LLMs demonstrate impressive generalization across domains without task-specific training:

**Language tasks**
- Text completion and generation
- Summarization and paraphrasing
- Translation between 100+ languages
- Question answering

**Reasoning tasks**
- Mathematical reasoning (with chain-of-thought)
- Code generation and debugging
- Logical deduction and inference

**Creative tasks**
- Story writing and poetry
- Brainstorming and ideation
- Style transfer

## The LLM Pipeline

Building a production LLM involves several stages:

```
Raw Text → Data Collection → Cleaning → Tokenization
    → Pre-training → Supervised Finetuning (SFT)
    → Reinforcement Learning from Human Feedback (RLHF)
    → Evaluation → Deployment
```

Each stage introduces critical design decisions that affect the final model's capabilities and alignment. This course covers each stage in depth.

## Key Architectural Choices

All modern LLMs share the Transformer backbone but differ in:

- **Context length**: From 4K tokens (early GPT-4) to 1M+ tokens (Gemini 1.5)
- **Architecture variant**: Decoder-only (GPT family), encoder-decoder (T5)
- **Attention mechanism**: Multi-head, grouped-query, multi-query attention
- **Normalization**: Pre-LayerNorm vs Post-LayerNorm
- **Activation function**: ReLU, GELU, SwiGLU

## Key Takeaways

- LLMs are autoregressive neural networks trained to predict text token-by-token
- The Transformer architecture (2017) was the key enabler of modern LLMs
- Scale (parameters + data) unlocks emergent capabilities
- Building production LLMs involves data, pre-training, post-training (SFT + RLHF), and evaluation stages
- This course follows the complete pipeline from data collection to deployment
