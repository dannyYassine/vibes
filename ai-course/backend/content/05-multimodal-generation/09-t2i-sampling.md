---
title: "T2I: Diffusion Sampling"
description: "Sampling algorithms for diffusion models: DDPM, DDIM, DPM-Solver, and advanced techniques"
duration_minutes: 12
order: 9
---

## The Sampling Problem

A trained diffusion model can generate high-quality images, but the quality and speed depend entirely on the **sampling algorithm**. DDPM's 1000-step sampling takes ~30 seconds per image; advanced samplers can do comparable quality in 20-50 steps (1-5 seconds).

## DDPM Sampling (Baseline)

```python
@torch.no_grad()
def ddpm_sample(model, text_emb, schedule, shape, guidance_scale=7.5):
    """1000-step DDPM sampling — slow but straightforward."""
    null_emb = encode_text("")
    x = torch.randn(shape)

    for t in reversed(range(schedule.T)):  # 999, 998, ..., 0
        t_batch = torch.full((shape[0],), t)

        # CFG: combine conditional and unconditional
        noise_cond = model(x, t_batch, text_emb)
        noise_uncond = model(x, t_batch, null_emb)
        noise_pred = noise_uncond + guidance_scale * (noise_cond - noise_uncond)

        # DDPM update
        alpha = schedule.alphas[t]
        alpha_bar = schedule.alpha_bars[t]
        beta = schedule.betas[t]

        x = (1 / alpha.sqrt()) * (
            x - beta / (1 - alpha_bar).sqrt() * noise_pred
        )
        if t > 0:
            x += beta.sqrt() * torch.randn_like(x)

    return x  # Takes ~1000 NFEs (neural function evaluations)
```

## DDIM Sampling (Faster)

DDIM skips steps deterministically. Same quality as DDPM in 50 steps:

```python
@torch.no_grad()
def ddim_sample(
    model, text_emb, null_emb, schedule,
    shape, n_steps=50, guidance_scale=7.5, eta=0.0
):
    """DDIM: deterministic subsampling of the diffusion process."""
    # Select n_steps evenly spaced timesteps
    timesteps = torch.linspace(schedule.T - 1, 0, n_steps).long()

    x = torch.randn(shape)

    for i, t in enumerate(timesteps):
        t_batch = torch.full((shape[0],), t)

        # CFG
        noise_cond = model(x, t_batch, text_emb)
        noise_uncond = model(x, t_batch, null_emb)
        noise_pred = noise_uncond + guidance_scale * (noise_cond - noise_uncond)

        alpha_bar = schedule.alpha_bars[t]
        alpha_bar_prev = schedule.alpha_bars[timesteps[i + 1]] if i < n_steps - 1 else torch.tensor(1.0)

        # Predict clean x0
        x0_pred = (x - (1 - alpha_bar).sqrt() * noise_pred) / alpha_bar.sqrt()
        x0_pred = x0_pred.clamp(-1, 1)

        # DDIM formula
        sigma = eta * ((1 - alpha_bar_prev) / (1 - alpha_bar)).sqrt() * (1 - alpha_bar / alpha_bar_prev).sqrt()
        direction = (1 - alpha_bar_prev - sigma**2).sqrt() * noise_pred
        x = alpha_bar_prev.sqrt() * x0_pred + direction + sigma * torch.randn_like(x)

    return x  # ~50 NFEs, comparable quality to 1000-step DDPM
```

## DPM-Solver: Even Fewer Steps

DPM-Solver (Lu et al., 2022) treats diffusion sampling as solving an ODE and uses higher-order solvers:

```python
# DPM-Solver++ can generate high-quality images in 15-20 steps
# It's a 2nd/3rd order ODE solver with adaptive step sizes

# Conceptually:
# DDPM: Euler method (1st order)
# DDIM: Modified Euler (approximates 1st order ODE)
# DPM-Solver: Runge-Kutta-like (2nd-3rd order, fewer steps needed)

# In practice, use the diffusers library:
from diffusers import DPMSolverMultistepScheduler

scheduler = DPMSolverMultistepScheduler(
    num_train_timesteps=1000,
    algorithm_type="dpmsolver++",
    solver_order=2,
)
# Set to 20 inference steps: same quality as 1000 DDPM steps
scheduler.set_timesteps(num_inference_steps=20)
```

## Sampling Parameters and Their Effects

```python
class SamplingConfig:
    guidance_scale: float = 7.5
    # 1.0: no guidance (diverse, may not match prompt)
    # 7.5: typical (good prompt adherence)
    # 15+: over-guided (artifacts, saturated colors)

    n_steps: int = 50
    # More steps: slower but higher quality
    # ~20: fast, acceptable quality (DPM-Solver)
    # ~50: standard quality (DDIM)
    # ~1000: max quality but very slow (DDPM)

    eta: float = 0.0
    # 0.0: deterministic (same seed = same image)
    # 1.0: stochastic (DDPM behavior)

    seed: int = 42
    # Controls initial noise; same seed + prompt = same image


def sample_with_seed(model, prompt, config: SamplingConfig):
    torch.manual_seed(config.seed)
    noise = torch.randn(1, 4, 64, 64)  # Deterministic initial noise
    return ddim_sample(model, encode_text(prompt), encode_text(""),
                       schedule, noise.shape, config.n_steps, config.guidance_scale)
```

## Negative Prompting

Negative prompts extend CFG to steer away from undesired features:

```python
def sample_with_negative_prompt(
    model, positive_prompt: str, negative_prompt: str,
    guidance_scale=7.5, n_steps=50
):
    """
    Instead of using empty string as unconditional,
    use the negative prompt as the "unconditioned" direction.
    """
    pos_emb = encode_text(positive_prompt)
    neg_emb = encode_text(negative_prompt)  # e.g., "blurry, low quality, watermark"

    x = torch.randn(shape)
    for t in reversed_timesteps(n_steps):
        noise_pos = model(x, t, pos_emb)
        noise_neg = model(x, t, neg_emb)

        # CFG pushes away from negative, toward positive
        noise_guided = noise_neg + guidance_scale * (noise_pos - noise_neg)
        x = update_step(x, t, noise_guided)

    return x
```

## Flow Matching Sampling (SD3/FLUX)

Flow matching uses a simpler ODE that enables even fewer steps:

```python
def flow_matching_sample(model, text_emb, shape, n_steps=28):
    """
    Flow matching sampling: solve dx/dt = v(x, t)
    using simple Euler integration.
    t: 1 (noise) → 0 (data)
    """
    x = torch.randn(shape)
    dt = -1.0 / n_steps

    for i in range(n_steps):
        t = 1.0 - i / n_steps
        t_batch = torch.full((shape[0],), t)

        # Model predicts velocity: direction from noise to data
        v = model(x, t_batch, text_emb)
        x = x + v * dt  # Euler step

    return x  # 28 steps is standard for FLUX
```

## Key Takeaways

- DDPM requires 1000 steps; DDIM achieves comparable quality in 50 steps
- DPM-Solver uses higher-order ODE solvers to reduce to 15-20 steps
- Guidance scale (7.5) trades prompt fidelity vs. diversity
- Negative prompts steer generation away from undesired attributes
- Flow matching (SD3, FLUX) enables high quality in 20-28 steps with simpler math
