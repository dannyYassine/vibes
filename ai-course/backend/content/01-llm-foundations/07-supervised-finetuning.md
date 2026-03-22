---
title: "Post-Training: Supervised Fine-Tuning (SFT)"
description: "How pre-trained base models are transformed into helpful assistants through instruction tuning"
duration_minutes: 16
order: 7
---

## From Base Model to Assistant

A pre-trained LLM is a powerful text completion engine, but it doesn't naturally follow instructions. Ask a base model "What is the capital of France?" and it might respond with more questions in the same style, or continue an essay — not answer your question.

**Supervised Fine-Tuning (SFT)** teaches the model to follow instructions by training on high-quality (instruction, response) pairs.

## The SFT Dataset

An SFT dataset consists of human-curated or AI-generated conversations:

```json
[
  {
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Explain the concept of recursion in programming."
      },
      {
        "role": "assistant",
        "content": "Recursion is a programming technique where a function calls itself to solve a problem by breaking it down into smaller subproblems..."
      }
    ]
  }
]
```

### Data Quality vs. Quantity

InstructGPT (OpenAI, 2022) showed that **just 13,000 high-quality instruction-response pairs** could significantly improve a 175B parameter model. Quality matters more than quantity.

Key quality criteria:
1. **Diverse instructions**: Cover many tasks (summarization, coding, Q&A, reasoning, etc.)
2. **Helpful responses**: Accurate, complete, well-structured
3. **Appropriate refusals**: Know when to decline harmful requests
4. **Format consistency**: Follow the conversation format exactly

### Data Sources

| Source | Method | Examples |
|--------|--------|----------|
| InstructGPT | Human-written instructions + human responses | 13K |
| Alpaca | GPT-3.5 generates instructions + responses | 52K |
| ShareGPT | Real ChatGPT conversations (user-shared) | 90K |
| OpenHermes | Various curated + synthetic | 1M |
| Llama 3 SFT | Mixture of human + synthetic | ~10M |

## The Training Objective

SFT uses the same cross-entropy loss as pre-training, but only on the **assistant's tokens** — the model isn't penalized for how it predicts the user's words:

```python
def compute_sft_loss(model, batch):
    input_ids = batch['input_ids']
    labels = batch['labels']  # -100 for prompt tokens (masked)

    outputs = model(input_ids, labels=labels)
    # HuggingFace handles the masking: -100 labels are ignored
    return outputs.loss

# Loss is only computed on assistant response tokens
# System prompt + user message tokens have label = -100
```

### Conversation Format

Each model family uses its own conversation template. Llama 3's format:

```
<|begin_of_text|>
<|start_header_id|>system<|end_header_id|>
You are a helpful assistant.<|eot_id|>
<|start_header_id|>user<|end_header_id|>
What is 2+2?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
2+2 equals 4.<|eot_id|>
```

The model learns to generate everything after `<|start_header_id|>assistant<|end_header_id|>`.

## Full Fine-Tuning vs. Parameter-Efficient Methods

### Full Fine-Tuning

Update all model parameters. Requires the same memory as pre-training (~16 bytes/parameter for optimizer state).

```python
from transformers import Trainer, TrainingArguments

trainer = Trainer(
    model=model,
    args=TrainingArguments(
        output_dir="./sft-output",
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=8,
        learning_rate=2e-5,
        warmup_ratio=0.03,
        lr_scheduler_type="cosine",
    ),
    train_dataset=sft_dataset,
)
trainer.train()
```

### LoRA (Parameter-Efficient Fine-Tuning)

Instead of updating all weights, LoRA adds small trainable matrices to specific layers:

```python
from peft import get_peft_model, LoraConfig

lora_config = LoraConfig(
    r=16,           # Rank of LoRA matrices
    lora_alpha=32,  # Scaling factor
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# trainable params: 4,194,304 || all params: 6,742,609,920
# trainable%: 0.062% ← only 0.06% of parameters!
```

LoRA reduces memory requirements by 10-100× and enables fine-tuning on consumer hardware.

## Hyperparameters for SFT

Key hyperparameters and their typical ranges:

| Parameter | Typical Range | Effect |
|-----------|--------------|--------|
| Learning rate | 1e-5 to 5e-5 | Too high → catastrophic forgetting |
| Batch size | 32-512 | Larger = more stable |
| Epochs | 1-5 | More → overfitting on small datasets |
| Warmup | 3-5% of steps | Prevents early instability |
| Max sequence length | 2048-8192 | Longer → more memory |

## Common Pitfalls

### Catastrophic Forgetting

Fine-tuning can make the model forget pre-training knowledge. Mitigations:
- Use a low learning rate
- Include some pre-training data in the SFT mix (5-10%)
- LoRA naturally reduces forgetting (original weights preserved)

### Sycophancy

Models fine-tuned on data where humans prefer agreeable responses learn to be sycophantic — agreeing with incorrect statements to please users. Mitigations:
- Include examples of appropriate disagreement
- RLHF can correct sycophancy

### Format Consistency

The model must learn the exact conversation format. One wrong token in the template means the model never learns when to stop generating.

## Evaluating SFT Quality

1. **MT-Bench**: 80 multi-turn questions judged by GPT-4
2. **AlpacaEval**: 805 instructions, win rate vs. reference model
3. **Human evaluation**: The gold standard, but expensive
4. **Task benchmarks**: MMLU, HumanEval, GSM8K for specific capabilities

## Key Takeaways

- SFT transforms a base model into an instruction-following assistant using (instruction, response) pairs
- Only 10K-100K high-quality examples can significantly change model behavior
- Loss is computed only on assistant tokens — the model doesn't need to predict user inputs
- LoRA enables fine-tuning with <1% trainable parameters, fitting on consumer hardware
- SFT alone creates a helpful assistant; RLHF is needed to align deeper values
