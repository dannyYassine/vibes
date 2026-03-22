---
title: "Finetuning, PEFT, Adapters, LoRA"
description: "Parameter-efficient fine-tuning methods for adapting LLMs to specific domains"
duration_minutes: 20
order: 2
---

## Full Fine-Tuning

Update all model parameters on task-specific data. Requires the same memory as pre-training (~16 bytes/parameter for optimizer states).

For a 7B model: ~112GB of GPU memory for training. That's 14× A100 80GB GPUs minimum.

## Parameter-Efficient Fine-Tuning (PEFT)

PEFT methods update only a small fraction of parameters, dramatically reducing compute and memory requirements.

### Adapter Layers

Insert small trainable modules between frozen transformer layers:

```python
class AdapterLayer(nn.Module):
    def __init__(self, hidden_size, adapter_size=64):
        super().__init__()
        self.down = nn.Linear(hidden_size, adapter_size)
        self.up = nn.Linear(adapter_size, hidden_size)
        self.act = nn.GELU()

    def forward(self, x):
        # Residual connection: x + adapter(x)
        return x + self.up(self.act(self.down(x)))
```

### LoRA (Low-Rank Adaptation)

The most popular PEFT method. Instead of updating weight matrix W directly, LoRA adds a low-rank decomposition:

```
W' = W + BA
where B ∈ R^(d×r), A ∈ R^(r×k), r << min(d,k)
```

```python
from peft import get_peft_model, LoraConfig, TaskType

lora_config = LoraConfig(
    r=16,                    # Rank — smaller = fewer params
    lora_alpha=32,           # Scaling factor (effective lr = lora_alpha/r)
    target_modules=[         # Which weight matrices to adapt
        "q_proj", "v_proj", "k_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)

model = get_peft_model(base_model, lora_config)
model.print_trainable_parameters()
# trainable params: 6,815,744 || all params: 6,738,415,616
# trainable%: 0.10%  ← only 0.1%!
```

### QLoRA

Quantize the base model to 4-bit, then apply LoRA adapters in full precision. Enables finetuning 65B models on a single 48GB GPU:

```python
from transformers import BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",          # NormalFloat4 quantization
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,     # Nested quantization
)

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Meta-Llama-3-8B",
    quantization_config=bnb_config,
    device_map="auto",
)
model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, lora_config)
```

## Training Loop

```python
from transformers import Trainer, TrainingArguments, DataCollatorForSeq2Seq

training_args = TrainingArguments(
    output_dir="./lora-output",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,    # Effective batch = 16
    warmup_ratio=0.03,
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    evaluation_strategy="steps",
    eval_steps=100,
    save_strategy="steps",
    save_steps=500,
    load_best_model_at_end=True,
    report_to="wandb",
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=DataCollatorForSeq2Seq(tokenizer, pad_to_multiple_of=8),
)
trainer.train()

# Save only LoRA weights (not full model)
model.save_pretrained("./lora-adapter")
```

## Merging LoRA Weights

After training, merge adapters back into the base model for faster inference:

```python
from peft import PeftModel

base_model = AutoModelForCausalLM.from_pretrained("meta-llama/Meta-Llama-3-8B")
model = PeftModel.from_pretrained(base_model, "./lora-adapter")
merged_model = model.merge_and_unload()  # Merge LoRA into base weights
merged_model.save_pretrained("./merged-model")
```

## Choosing LoRA Rank

| Rank (r) | Trainable Params | Use Case |
|----------|-----------------|---------|
| 4-8 | Very few | Style/format only |
| 16-32 | Moderate | Domain adaptation |
| 64-128 | Many | Complex behavioral changes |
| 256+ | Many | Approaching full finetune |

## Key Takeaways

- Full finetuning requires 10-20× the model size in GPU memory
- LoRA updates only 0.1-1% of parameters with comparable quality
- QLoRA enables finetuning large models on consumer hardware
- Merge LoRA adapters into base weights before production deployment
- Start with rank=16; increase if quality is insufficient
