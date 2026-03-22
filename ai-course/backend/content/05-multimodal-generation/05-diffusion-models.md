---
title: "Diffusion Models"
description: "The forward/reverse diffusion process, DDPM, score matching, and DDIM sampling"
duration_minutes: 16
order: 5
---

## The Diffusion Intuition

Diffusion models learn to reverse a gradual noising process. During training, we add noise to images step by step until they become pure Gaussian noise. The model learns to undo each step.

At inference, we start from random noise and denoise iteratively until we have a clean image.

```
Training (forward process):
  Image x₀ → x₁ (slightly noisy) → x₂ → ... → x_T (pure noise)

Inference (reverse process):
  Pure noise x_T → x_{T-1} → ... → x₀ (clean image)
```

## The Forward Process (Adding Noise)

The forward process is a fixed (non-learned) Markov chain that gradually adds Gaussian noise:

```python
import torch
import numpy as np

class DiffusionSchedule:
    def __init__(self, T=1000, beta_start=1e-4, beta_end=0.02):
        self.T = T
        # Linear beta schedule: noise level increases from beta_start to beta_end
        self.betas = torch.linspace(beta_start, beta_end, T)

        # Precompute alpha quantities
        self.alphas = 1.0 - self.betas
        self.alpha_bars = torch.cumprod(self.alphas, dim=0)  # ᾱ_t = Π αᵢ

    def add_noise(self, x0, t, noise=None):
        """
        Sample x_t ~ q(x_t | x_0) in ONE step (no need to iterate).
        x_t = sqrt(ᾱ_t) * x₀ + sqrt(1 - ᾱ_t) * ε
        where ε ~ N(0, I)
        """
        if noise is None:
            noise = torch.randn_like(x0)

        alpha_bar_t = self.alpha_bars[t].view(-1, 1, 1, 1)
        return (
            torch.sqrt(alpha_bar_t) * x0
            + torch.sqrt(1 - alpha_bar_t) * noise
        ), noise
```

The closed-form formula lets us sample x_t directly without simulating all T steps — critical for training efficiency.

## The Reverse Process (Denoising)

The model learns to predict the noise ε that was added, then we can recover x_{t-1} from x_t:

```python
import torch.nn as nn

class DDPM:
    def __init__(self, unet, schedule: DiffusionSchedule):
        self.unet = unet  # Predicts noise given noisy image and timestep
        self.schedule = schedule

    def training_loss(self, x0: torch.Tensor) -> torch.Tensor:
        """DDPM training objective: predict the noise added at step t."""
        B = x0.size(0)

        # Sample random timesteps
        t = torch.randint(0, self.schedule.T, (B,))

        # Add noise
        x_t, noise = self.schedule.add_noise(x0, t)

        # Predict the noise
        noise_pred = self.unet(x_t, t)

        # Simple MSE loss on noise prediction
        return nn.functional.mse_loss(noise_pred, noise)

    @torch.no_grad()
    def sample(self, shape: tuple) -> torch.Tensor:
        """DDPM sampling: T steps of denoising."""
        x = torch.randn(shape)  # Start from pure noise

        for t in reversed(range(self.schedule.T)):
            t_tensor = torch.full((shape[0],), t, dtype=torch.long)

            # Predict noise
            noise_pred = self.unet(x, t_tensor)

            # Compute x_{t-1} from x_t and predicted noise
            alpha_t = self.schedule.alphas[t]
            alpha_bar_t = self.schedule.alpha_bars[t]
            beta_t = self.schedule.betas[t]

            # DDPM update rule
            x = (1 / torch.sqrt(alpha_t)) * (
                x - (beta_t / torch.sqrt(1 - alpha_bar_t)) * noise_pred
            )

            # Add noise for all but the last step
            if t > 0:
                noise = torch.randn_like(x)
                x += torch.sqrt(beta_t) * noise

        return x
```

## Score Matching Interpretation

Diffusion models can be understood as learning the **score function**: ∇_x log p(x).

The score points in the direction of higher probability. Knowing the score at every noise level lets us follow gradient ascent toward high-probability images:

```python
# Score matching perspective:
# ε_θ(x_t, t) ≈ -√(1-ᾱ_t) * ∇_{x_t} log p_t(x_t)
#
# The noise prediction IS the (scaled) score function
# This connects diffusion models to energy-based models and SDEs

# Song et al. (2021) showed all diffusion variants are discretizations
# of a continuous stochastic differential equation (SDE):
#   dx = f(x,t)dt + g(t)dW
# where W is Brownian motion
```

## DDIM: Faster Sampling

DDPM requires 1000 denoising steps (slow). DDIM (Song et al., 2021) achieves comparable quality in 10-50 steps by treating the process deterministically:

```python
@torch.no_grad()
def ddim_sample(
    unet,
    schedule,
    shape: tuple,
    n_steps: int = 50,
    eta: float = 0.0,  # eta=0: deterministic; eta=1: full DDPM stochasticity
) -> torch.Tensor:
    """DDIM sampling — much faster than DDPM."""
    # Select a subset of timesteps
    timesteps = torch.linspace(schedule.T - 1, 0, n_steps, dtype=torch.long)

    x = torch.randn(shape)

    for i, t in enumerate(timesteps):
        t_prev = timesteps[i + 1] if i < len(timesteps) - 1 else torch.tensor(-1)

        alpha_bar = schedule.alpha_bars[t]
        alpha_bar_prev = schedule.alpha_bars[t_prev] if t_prev >= 0 else torch.tensor(1.0)

        # Predict noise
        noise_pred = unet(x, t.repeat(shape[0]))

        # Predict x_0 from current x_t and predicted noise
        x0_pred = (x - torch.sqrt(1 - alpha_bar) * noise_pred) / torch.sqrt(alpha_bar)
        x0_pred = x0_pred.clamp(-1, 1)

        # DDIM update
        direction = torch.sqrt(1 - alpha_bar_prev) * noise_pred
        x = torch.sqrt(alpha_bar_prev) * x0_pred + direction

    return x
```

## The U-Net Architecture

The denoising model is typically a U-Net with:
- **Encoder path**: downsample with residual blocks
- **Bottleneck**: self-attention layers
- **Decoder path**: upsample with skip connections from encoder
- **Conditioning**: timestep embedding injected via AdaGN or cross-attention for text

## Key Takeaways

- Diffusion models learn to reverse a gradual Gaussian noising process
- Forward process has a closed-form solution: no need to simulate T steps
- Training objective: predict the noise ε added at each step (simple MSE)
- DDPM requires T=1000 denoising steps; DDIM reduces to 10-50 with comparable quality
- The denoising model is a U-Net that receives both the noisy image and the timestep
