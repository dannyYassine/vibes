---
title: "Post-Training: RL and RLHF"
description: "Reinforcement Learning from Human Feedback — aligning LLMs with human values and preferences"
duration_minutes: 20
order: 8
---

## Why RLHF?

SFT teaches a model to imitate good responses, but it can't directly optimize for what humans actually prefer. Two responses can both be grammatically correct and factually accurate while differing enormously in helpfulness, clarity, or safety.

**RLHF (Reinforcement Learning from Human Feedback)** uses human preference judgments to train a reward model, then uses that reward signal to optimize the LLM via reinforcement learning.

RLHF was the key innovation behind ChatGPT's success — it transformed GPT-3 from "impressive but erratic" to "reliably helpful."

## The RLHF Pipeline

```
SFT Model
    ↓
Human Preference Data Collection
    ↓
Reward Model Training
    ↓
RL Fine-Tuning (PPO)
    → Aligned Model
```

## Stage 1: Collect Human Preferences

Annotators are shown a prompt and two or more model responses, and asked to indicate which is better:

```json
{
  "prompt": "Explain why the sky is blue",
  "chosen": "The sky appears blue due to Rayleigh scattering...",
  "rejected": "The sky is blue because of the sun."
}
```

Good preference data:
- Covers diverse tasks and edge cases
- Clear labeling guidelines (what makes a response better?)
- Multiple annotators per example with agreement metrics
- Covers safety scenarios (refusals, harmful content)

## Stage 2: Train a Reward Model

The reward model (RM) is initialized from the SFT model (or a similar architecture) and trained to predict human preferences:

```python
class RewardModel(nn.Module):
    def __init__(self, base_model):
        super().__init__()
        self.base = base_model
        # Single scalar output head
        self.reward_head = nn.Linear(base_model.config.hidden_size, 1)

    def forward(self, input_ids, attention_mask):
        hidden = self.base(input_ids, attention_mask).last_hidden_state
        # Use last non-padding token
        last_hidden = hidden[:, -1, :]
        return self.reward_head(last_hidden).squeeze(-1)

def reward_model_loss(reward_model, chosen_ids, rejected_ids):
    r_chosen = reward_model(chosen_ids)
    r_rejected = reward_model(rejected_ids)
    # Bradley-Terry model: prefer chosen over rejected
    loss = -F.logsigmoid(r_chosen - r_rejected).mean()
    return loss
```

The RM learns to assign higher scores to responses humans prefer.

## Stage 3: RL Fine-Tuning with PPO

PPO (Proximal Policy Optimization) fine-tunes the SFT model to maximize reward model scores while staying close to the original SFT policy (to prevent reward hacking).

```python
def ppo_loss(
    policy_model,    # The model being trained
    ref_model,       # Frozen SFT model (KL reference)
    reward_model,
    prompts,
    kl_coef=0.1,
):
    # Generate responses with current policy
    responses = policy_model.generate(prompts)

    # Compute rewards
    rewards = reward_model(prompts + responses)

    # KL divergence penalty: don't drift too far from SFT
    policy_logprobs = policy_model.log_probs(prompts + responses)
    ref_logprobs = ref_model.log_probs(prompts + responses)
    kl_penalty = (policy_logprobs - ref_logprobs).sum(dim=-1)

    # Final reward = model reward - KL penalty
    total_reward = rewards - kl_coef * kl_penalty

    # PPO clip objective
    ...
    return ppo_objective
```

The KL penalty is critical — without it, the model would find ways to get high reward scores that don't correspond to actual quality (reward hacking).

## Direct Preference Optimization (DPO)

PPO is complex and unstable. **DPO** (Rafailov et al., 2023) achieves similar alignment without a separate reward model or RL loop:

```python
def dpo_loss(policy_model, ref_model, chosen_ids, rejected_ids, beta=0.1):
    # Log probabilities under current policy
    policy_log_probs_chosen = policy_model.log_probs(chosen_ids)
    policy_log_probs_rejected = policy_model.log_probs(rejected_ids)

    # Log probabilities under reference (frozen SFT) policy
    ref_log_probs_chosen = ref_model.log_probs(chosen_ids)
    ref_log_probs_rejected = ref_model.log_probs(rejected_ids)

    # DPO objective
    pi_log_ratio = policy_log_probs_chosen - policy_log_probs_rejected
    ref_log_ratio = ref_log_probs_chosen - ref_log_probs_rejected

    loss = -F.logsigmoid(beta * (pi_log_ratio - ref_log_ratio)).mean()
    return loss
```

DPO is:
- Simpler: No RM training, no sampling loop
- Stable: Standard supervised training
- Competitive: Similar quality to PPO on many tasks

Most open-source RLHF today uses DPO rather than PPO.

## Constitutional AI (CAI)

Anthropic's **Constitutional AI** approach (Claude's training) uses a written constitution of principles instead of human preference labels:

1. **SL-CAI**: Model critiques its own responses against the constitution and revises them
2. **RL-CAI**: Trains a reward model on AI-generated (chosen, rejected) pairs

This reduces reliance on human annotation for safety-specific training.

## Group Relative Policy Optimization (GRPO)

DeepSeek's innovation for reasoning models. Instead of a critic network, GRPO estimates advantage from a group of responses to the same prompt:

```python
def grpo_loss(policy, prompts, group_size=4, beta=0.1):
    advantages = []
    for prompt in prompts:
        # Sample group_size responses
        responses = [policy.generate(prompt) for _ in range(group_size)]
        rewards = [verify_answer(r) for r in responses]

        # Normalize within group
        mean_r = np.mean(rewards)
        std_r = np.std(rewards) + 1e-8
        advantages.extend([(r - mean_r) / std_r for r in rewards])

    # Policy gradient with KL penalty
    ...
```

GRPO is used by DeepSeek-R1 and enables RL training without a value network.

## Reward Hacking

A fundamental challenge: the reward model is imperfect, so maximizing it doesn't always mean improving the actual quality:

- **Length hacking**: Longer responses score higher (RM trained on verbose data)
- **Sycophancy**: Agreeing with incorrect premises scores higher
- **Format gaming**: Using lists/headers regardless of appropriateness

Mitigations:
- Length-normalized rewards
- Diverse preference data including disagreement examples
- Multiple reward models averaged together
- Regular human evaluation against the optimized model

## Key Takeaways

- RLHF = reward model training + RL optimization against that reward
- PPO is the original RLHF algorithm; DPO simplifies it dramatically
- The KL penalty prevents reward hacking by keeping the policy near the SFT baseline
- Constitutional AI uses written principles instead of human preference data
- GRPO enables RL for reasoning models using group-relative advantages
- Reward hacking is a fundamental challenge: optimizing a proxy reward can diverge from true quality
