---
title: "T2I: Diffusion Training"
description: "Training objectives, classifier-free guidance, noise schedules, and multi-stage training pipelines"
duration_minutes: 14
order: 8
---

## The Core Training Objective

Training a text-to-image diffusion model minimizes the noise prediction error across timesteps and text conditions:

```python
import torch
import torch.nn as nn
from torch.optim import AdamW

def diffusion_training_step(
    model,          # U-Net or DiT
    text_encoder,   # CLIP or T5
    vae,            # VAE encoder (for latent diffusion)
    batch: dict,    # {"image": ..., "caption": ...}
    schedule,       # Noise schedule
    optimizer,
):
    images = batch["image"]      # (B, 3, H, W), normalized [-1, 1]
    captions = batch["caption"]  # list of strings

    # Step 1: Encode images to latent space
    with torch.no_grad():
        latents = vae.encode(images).latent_dist.sample()
        latents = latents * 0.18215  # Scale factor for stable training

    # Step 2: Encode text
    with torch.no_grad():
        text_embeddings = text_encoder.encode(captions)
        # (B, 77, 768) for CLIP

    # Step 3: Sample random timesteps
    B = latents.size(0)
    t = torch.randint(0, schedule.T, (B,), device=latents.device)

    # Step 4: Add noise
    noise = torch.randn_like(latents)
    noisy_latents = schedule.add_noise(latents, t, noise)

    # Step 5: Predict noise
    noise_pred = model(noisy_latents, t, text_embeddings)

    # Step 6: Compute loss
    loss = nn.functional.mse_loss(noise_pred, noise)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    return loss.item()
```

## Classifier-Free Guidance (CFG)

CFG (Ho & Salimans, 2021) is the most impactful training technique for controllable generation. During training, randomly drop the text condition (replace with null/empty):

```python
def training_step_with_cfg(model, batch, schedule, optimizer, cfg_dropout=0.1):
    """Training with conditional dropout for classifier-free guidance."""
    images, captions = batch["image"], batch["caption"]

    latents = encode_to_latent(images)
    t = torch.randint(0, schedule.T, (len(images),))
    noise = torch.randn_like(latents)
    noisy_latents = schedule.add_noise(latents, t, noise)

    # Randomly drop text condition during training
    text_embeddings = []
    for caption in captions:
        if torch.rand(1).item() < cfg_dropout:
            # Use null/unconditional embedding
            text_embeddings.append(encode_text(""))
        else:
            text_embeddings.append(encode_text(caption))
    text_embeddings = torch.stack(text_embeddings)

    noise_pred = model(noisy_latents, t, text_embeddings)
    return nn.functional.mse_loss(noise_pred, noise)


# At inference, combine conditional and unconditional predictions:
def cfg_inference(model, noisy_x, t, text_emb, null_emb, guidance_scale=7.5):
    """Classifier-free guidance at inference time."""
    # Run model twice: conditioned and unconditioned
    noise_cond = model(noisy_x, t, text_emb)
    noise_uncond = model(noisy_x, t, null_emb)

    # Extrapolate in the direction of the text condition
    # guidance_scale > 1: amplify text-image alignment (at cost of diversity)
    noise_guided = noise_uncond + guidance_scale * (noise_cond - noise_uncond)
    return noise_guided
```

**Guidance scale**: typical range 7.5-12. Higher = more faithful to prompt but less diverse.

## Noise Schedule Choices

The noise schedule affects which frequency details the model learns to handle:

```python
class CosineSchedule:
    """
    Cosine schedule (Nichol & Dhariwal, 2021).
    More gradual than linear at small/large t.
    """
    def __init__(self, T=1000, s=0.008):
        self.T = T
        steps = torch.arange(T + 1, dtype=torch.float32)
        f = torch.cos((steps / T + s) / (1 + s) * torch.pi / 2) ** 2
        alpha_bars = f / f[0]
        self.alpha_bars = alpha_bars[:-1]
        self.betas = 1 - alpha_bars[1:] / alpha_bars[:-1]
        self.betas = self.betas.clamp(max=0.999)


class FlowMatchingSchedule:
    """
    Flow matching (Lipman et al., 2022) — used in SD3, FLUX.
    Simpler: linear interpolation between noise and data.
    """
    def add_noise(self, x0, t, noise=None):
        """
        x_t = t * noise + (1-t) * x0
        t ∈ [0, 1]: 0 = clean, 1 = pure noise
        """
        if noise is None:
            noise = torch.randn_like(x0)
        t_expanded = t.view(-1, 1, 1, 1)
        return t_expanded * noise + (1 - t_expanded) * x0, noise
```

Flow matching simplifies the training target and enables deterministic ODE solvers, reducing inference steps.

## Multi-Stage Training Pipeline

Production T2I models train in stages:

```
Stage 1: Low-resolution pre-training (256×256)
  - Large batch, high learning rate
  - Model learns composition, semantics
  - Duration: ~50% of compute

Stage 2: High-resolution fine-tuning (512×512 or 1024×1024)
  - Smaller batch, lower learning rate
  - Model learns texture, detail
  - Duration: ~40% of compute

Stage 3: Quality fine-tuning
  - Aesthetic subset (high CLIP + aesthetic scores)
  - Human preference data (RLHF-style)
  - Duration: ~10% of compute
```

## Exponential Moving Average (EMA)

```python
class EMAModel:
    """
    Maintains an EMA of model weights.
    EMA model produces better inference quality than the trained model.
    """
    def __init__(self, model, decay=0.9999):
        self.ema_params = {
            name: param.clone().detach()
            for name, param in model.named_parameters()
        }
        self.decay = decay

    def update(self, model):
        with torch.no_grad():
            for name, param in model.named_parameters():
                self.ema_params[name].mul_(self.decay).add_(
                    param.data, alpha=1 - self.decay
                )
```

EMA weight decay of 0.9999 is standard. The EMA model is used for inference.

## v-Prediction Parameterization

Instead of predicting the noise ε, newer models predict a "velocity" v:

```python
def get_v_target(x0, noise, alpha_bar_t):
    """
    v = sqrt(ᾱ) * ε - sqrt(1-ᾱ) * x₀
    v-prediction improves training stability at extreme noise levels.
    """
    sqrt_ab = torch.sqrt(alpha_bar_t)
    sqrt_1_ab = torch.sqrt(1 - alpha_bar_t)
    return sqrt_ab * noise - sqrt_1_ab * x0
```

## Key Takeaways

- Training objective: predict the noise added to latent encodings at random timesteps
- Classifier-free guidance: randomly drop text condition during training; amplify text direction at inference
- Guidance scale (7.5-12) trades off fidelity vs. diversity
- Cosine and flow-matching schedules outperform linear noise schedules
- EMA weights produce better inference quality than the raw trained weights
