---
title: "Overview of Image and Video Generation"
description: "Survey of generative model families: VAEs, GANs, autoregressive models, and diffusion models"
duration_minutes: 14
order: 1
---

## The Generative Modeling Problem

Given a dataset of images or videos, learn a distribution p(x) such that sampling from it produces new, realistic content. Four major paradigms have emerged:

1. **Variational Autoencoders (VAEs)** — encode to latent space, decode back
2. **Generative Adversarial Networks (GANs)** — generator vs. discriminator game
3. **Autoregressive models** — predict next token/pixel sequentially
4. **Diffusion models** — iteratively denoise from random noise

## Comparison of Paradigms

| Model | Quality | Diversity | Speed | Controllability |
|-------|---------|-----------|-------|-----------------|
| VAE | Medium | High | Fast | Medium |
| GAN | High | Low-Medium | Fast | Hard |
| Autoregressive | High | High | Slow | Medium |
| Diffusion | Highest | High | Medium | Highest |

Diffusion models currently dominate image and video generation due to their combination of quality, diversity, and controllability.

## What Makes Image Generation Hard

### The Curse of Dimensionality

A 512×512 RGB image lives in a 786,432-dimensional space. The manifold of "real images" is a tiny, complex surface within this space.

```python
# A random pixel array is almost certainly not a "real" image
import numpy as np

# This produces noise, not a face
random_image = np.random.randint(0, 256, (512, 512, 3), dtype=np.uint8)

# We need to model the distribution of natural images
# P(image looks like a real photo) is concentrated on a tiny manifold
```

### The Evaluation Problem

Unlike language where perplexity is a natural metric, image quality is subjective. Common metrics:

```python
# FID (Fréchet Inception Distance) — lower is better
# Measures distance between real and generated image distributions in feature space
# FID = ||μ_r - μ_g||² + Tr(Σ_r + Σ_g - 2(Σ_r Σ_g)^(1/2))

# CLIP score — measures text-image alignment
# IS (Inception Score) — measures quality and diversity
```

## From Images to Video

Video generation adds the temporal dimension — frames must be spatially and temporally consistent:

```
Image: [H × W × C]
Video: [T × H × W × C]  where T = number of frames
```

A 5-second clip at 24fps at 512×512 = 24×5 × 512 × 512 × 3 = ~944M values

This makes video generation significantly harder:
- **Temporal consistency**: objects shouldn't flicker or warp
- **Motion realism**: physics, velocity, occlusion
- **Compute**: training on video requires massive GPU memory

## Conditioning: Text-to-Image/Video

Modern generators are **conditional** — they generate images matching a text prompt:

```python
# Text conditioning architecture overview
# 1. Encode text prompt with CLIP or T5
# 2. Inject text embeddings into image generator (cross-attention)
# 3. Generator learns to align visual output with text semantics

class TextConditionedGenerator:
    def __init__(self, text_encoder, image_generator):
        self.text_encoder = text_encoder
        self.image_generator = image_generator

    def generate(self, prompt: str) -> "Image":
        # Step 1: Encode text
        text_embedding = self.text_encoder.encode(prompt)
        # Shape: (batch, seq_len, embed_dim) e.g. (1, 77, 768) for CLIP

        # Step 2: Generate image conditioned on text
        image = self.image_generator.sample(
            text_conditioning=text_embedding
        )
        return image
```

## The Role of Latent Spaces

All modern high-resolution generators work in a **latent space** rather than pixel space:

```
Pixel space: 512×512×3 = 786K dimensions
Latent space: 64×64×4 = 16K dimensions (48× compression)
```

A VAE-like encoder compresses images to latent codes. The generator operates in latent space, then a decoder upsamples to pixels. This makes training feasible on high-resolution content.

## Key Takeaways

- Four generative paradigms: VAEs, GANs, autoregressive, diffusion — each with different trade-offs
- Diffusion models dominate due to quality + diversity + controllability
- Working in latent space (not pixels) is essential for high-resolution generation
- Text conditioning uses cross-attention to align visual output with text semantics
- Video generation extends images with temporal consistency challenges
