---
title: "RL with a Verifier"
description: "Training reasoning models with reinforcement learning using outcome verification (GRPO, DeepSeek-R1)"
duration_minutes: 15
order: 8
---

## Why RL for Reasoning?

SFT teaches a model to *imitate* reasoning traces. RL teaches a model to *discover* reasoning strategies through trial and error — and can exceed the quality of training data.

The key insight: for math and code problems, we can **automatically verify correctness**. This gives us a free reward signal for RL, without needing human feedback.

## The RL Setup for Reasoning

```
Policy (LLM) → generates solution → Verifier checks → reward signal → policy update
```

The policy is the language model. The action space is token generation. The reward is binary: did the final answer pass verification?

```python
def reasoning_reward(question: str, model_output: str, ground_truth: str) -> float:
    """Reward function for math reasoning."""
    predicted_answer = extract_boxed_answer(model_output)

    # Binary reward: correct or not
    if predicted_answer is None:
        return -0.5  # Penalize for not providing an answer

    if normalize_answer(predicted_answer) == normalize_answer(ground_truth):
        return 1.0

    return 0.0  # Wrong answer


def format_reward(model_output: str) -> float:
    """Reward for following correct output format."""
    has_thinking = "<think>" in model_output and "</think>" in model_output
    has_answer = "<answer>" in model_output

    if has_thinking and has_answer:
        return 0.1  # Small bonus for correct format
    return -0.1
```

## GRPO: Group Relative Policy Optimization

DeepSeek-R1 uses **GRPO** (a variant of PPO without a value network). Instead of estimating value with a separate model, it uses *group statistics* from multiple sampled outputs:

```python
def grpo_advantage(rewards: list[float]) -> list[float]:
    """
    Normalize rewards within a group of outputs for the same question.
    This replaces the value network in standard PPO.
    """
    mean_reward = sum(rewards) / len(rewards)
    std_reward = (sum((r - mean_reward)**2 for r in rewards) / len(rewards)) ** 0.5

    if std_reward < 1e-8:
        return [0.0] * len(rewards)

    # Advantage = how much better than the group average
    return [(r - mean_reward) / (std_reward + 1e-8) for r in rewards]


def grpo_training_step(policy, questions: list[str], ground_truths: list[str], G: int = 8):
    """
    GRPO training step.
    G = group size (number of outputs per question)
    """
    all_losses = []

    for question, truth in zip(questions, ground_truths):
        # Sample G outputs from current policy
        outputs = [policy.generate(question) for _ in range(G)]

        # Compute rewards
        rewards = [reasoning_reward(question, o, truth) for o in outputs]

        # Compute advantages via group normalization
        advantages = grpo_advantage(rewards)

        # Policy gradient loss
        for output, advantage in zip(outputs, advantages):
            log_prob = policy.log_prob(question, output)
            # Old policy log prob (for clipping)
            with torch.no_grad():
                old_log_prob = old_policy.log_prob(question, output)

            ratio = torch.exp(log_prob - old_log_prob)
            # Clipped objective (PPO-style)
            clipped_ratio = torch.clamp(ratio, 1 - 0.2, 1 + 0.2)
            loss = -torch.min(ratio * advantage, clipped_ratio * advantage)
            all_losses.append(loss)

    return torch.stack(all_losses).mean()
```

## DeepSeek-R1: The Architecture

DeepSeek-R1's training pipeline (2025):

```
Stage 1: Cold Start (SFT)
  - Fine-tune on small set of long CoT examples
  - Establishes basic reasoning format

Stage 2: RL (GRPO)
  - Reward = correctness (math/code verifiers) + format bonus
  - Model learns to use <think> blocks for internal reasoning
  - "Aha moments" emerge: model learns to backtrack and self-verify

Stage 3: Rejection Sampling + SFT
  - Sample solutions from RL model
  - Keep only correct ones
  - Fine-tune again for instruction following + readability

Stage 4: Final RL Round
  - Second RL pass for general helpfulness
```

The emergent **"aha moment"** behavior — where the model reconsiders its approach mid-reasoning — was not explicitly trained for; it emerged from the reward signal.

## Reward Shaping

Raw binary rewards can be sparse and noisy. Reward shaping helps:

```python
class ShapedReward:
    def __call__(self, question: str, output: str, truth: str) -> float:
        reward = 0.0

        # Primary: correctness
        if is_correct(extract_answer(output), truth):
            reward += 1.0

        # Secondary: reasoning quality signals
        think_content = extract_thinking(output)
        if think_content:
            # Reward for showing work
            reward += 0.05 * min(len(think_content.split()) / 100, 1.0)

            # Reward for self-correction (contains "wait" or "actually")
            revision_words = ["wait", "actually", "let me reconsider", "i made an error"]
            if any(w in think_content.lower() for w in revision_words):
                reward += 0.1

        # Penalty for extremely long outputs (efficiency)
        token_count = count_tokens(output)
        if token_count > 2000:
            reward -= 0.01 * (token_count - 2000) / 1000

        return reward
```

## KL Divergence Penalty

To prevent the policy from drifting too far from the reference model (which would cause catastrophic forgetting):

```python
def compute_kl_penalty(policy_log_probs, ref_log_probs, beta=0.01):
    """
    KL divergence penalty: discourages policy from moving too far from reference.
    beta controls the strength of the penalty.
    """
    kl = (policy_log_probs - ref_log_probs).mean()
    return beta * kl

# Total loss
loss = -policy_gradient_loss + kl_penalty
```

## Key Results from RL-Trained Reasoning Models

- DeepSeek-R1 achieves ~79% on AIME 2024 (vs ~10% for standard SFT)
- Models learn to use more tokens on harder problems (adaptive compute)
- Self-correction and verification emerge without being explicitly trained
- RL can exceed the performance ceiling set by the training data

## Key Takeaways

- RL with verifiers allows training on outcomes alone — no labeled reasoning traces needed
- GRPO replaces the value network with within-group reward normalization
- DeepSeek-R1's pipeline: cold start SFT → RL → rejection sampling → RL
- Reward shaping guides the model toward useful reasoning behaviors
- KL penalty prevents catastrophic forgetting of the base model
