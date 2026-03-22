---
title: "Auto-regressive Models"
description: "Pixel-level and token-level autoregressive generation, VQ-VAE, and discrete image tokenization"
duration_minutes: 12
order: 4
---

## Autoregressive Generation for Images

Autoregressive models generate data one element at a time, where each element depends on all previous ones:

```
p(x) = p(x₁) × p(x₂|x₁) × p(x₃|x₁,x₂) × ...
```

For images, this means predicting pixels (or tokens) one by one in some ordering (typically raster scan: left-to-right, top-to-bottom).

## PixelRNN/PixelCNN

OpenAI's PixelCNN (Van den Oord et al., 2016) applies masked convolutions to model pixel dependencies:

```python
import torch
import torch.nn as nn

class MaskedConv2d(nn.Conv2d):
    """
    Masked convolution: only attends to pixels that have already been generated.
    Type A: excludes current pixel (used in first layer)
    Type B: includes current pixel (used in subsequent layers)
    """
    def __init__(self, mask_type, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.register_buffer("mask", self.weight.data.clone())
        _, _, h, w = self.weight.size()
        self.mask.fill_(1)
        self.mask[:, :, h // 2, w // 2 + (mask_type == "B"):] = 0
        self.mask[:, :, h // 2 + 1:] = 0  # Don't attend to rows below

    def forward(self, x):
        self.weight.data *= self.mask
        return super().forward(x)


# Pixel generation is slow: 512×512 RGB = 786,432 sequential predictions
def generate_pixel_by_pixel(model, h=28, w=28, channels=1):
    """Generate a 28×28 grayscale image pixel by pixel."""
    image = torch.zeros(1, channels, h, w)
    for row in range(h):
        for col in range(w):
            for c in range(channels):
                logits = model(image)  # (1, 256, H, W) — 256 possible pixel values
                probs = torch.softmax(logits[:, :, row, col], dim=1)
                pixel_val = torch.multinomial(probs, 1)
                image[0, c, row, col] = pixel_val.float() / 255.0
    return image
```

**Major limitation**: generating a 512×512 image requires 786K sequential forward passes. Completely impractical for high-resolution images.

## VQ-VAE: Discrete Image Tokens

The key insight: instead of modeling pixels directly, first **tokenize** the image into a small grid of discrete codes, then model those codes autoregressively.

```python
class VectorQuantizer(nn.Module):
    """
    Replaces continuous latent vectors with discrete codebook entries.
    """
    def __init__(self, n_embeddings=512, embedding_dim=64):
        super().__init__()
        self.codebook = nn.Embedding(n_embeddings, embedding_dim)

    def forward(self, z_e):
        """
        z_e: continuous encoder output (B, C, H, W)
        Returns: quantized z_q and indices
        """
        # Reshape: (B, C, H, W) → (B*H*W, C)
        z_flat = z_e.permute(0, 2, 3, 1).reshape(-1, z_e.size(1))

        # Find nearest codebook vector for each spatial position
        distances = (
            z_flat.pow(2).sum(1, keepdim=True)
            - 2 * z_flat @ self.codebook.weight.T
            + self.codebook.weight.pow(2).sum(1)
        )
        indices = distances.argmin(dim=1)

        # Quantize: replace with codebook vectors
        z_q = self.codebook(indices).view(z_e.permute(0,2,3,1).shape)
        z_q = z_q.permute(0, 3, 1, 2)

        # Straight-through estimator: copy gradients from z_q to z_e
        z_q_st = z_e + (z_q - z_e).detach()

        return z_q_st, indices


class VQVAE(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = ConvEncoder()      # image → (B, 64, 16, 16)
        self.quantizer = VectorQuantizer(n_embeddings=512, embedding_dim=64)
        self.decoder = ConvDecoder()      # (B, 64, 16, 16) → image

    def forward(self, x):
        z_e = self.encoder(x)
        z_q, indices = self.quantizer(z_e)
        reconstruction = self.decoder(z_q)
        return reconstruction, z_e, z_q, indices
```

A 256×256 image compressed to 16×16 = 256 tokens from a 512-entry codebook. Now autoregressive generation only needs 256 sequential steps.

## ImageGPT and VQGAN

**ImageGPT** (Chen et al., 2020): trains a GPT model on sequences of pixel color clusters. Demonstrates that self-supervised image models can learn strong representations.

**VQGAN** (Esser et al., 2021): combines VQ-VAE with a GAN discriminator and perceptual loss for higher-fidelity compression:

```python
# VQGAN training losses
def vqgan_loss(reconstruction, original, z_e, z_q, discriminator):
    # 1. Reconstruction loss (L1/L2)
    recon_loss = F.l1_loss(reconstruction, original)

    # 2. Perceptual loss (VGG features)
    perc_loss = perceptual_loss(reconstruction, original)

    # 3. GAN loss (discriminator for sharpness)
    gan_loss = -discriminator(reconstruction).mean()

    # 4. VQ commitment loss
    commit_loss = F.mse_loss(z_e.detach(), z_q) + 0.25 * F.mse_loss(z_e, z_q.detach())

    return recon_loss + perc_loss + 0.8 * gan_loss + commit_loss
```

## Transformers for Image Generation: DALL-E 1

DALL-E (OpenAI, 2021) used a two-stage approach:
1. Train a VQVAE to tokenize images into 32×32 = 1024 tokens
2. Train a GPT model on (text tokens + image tokens) sequences

```python
# DALL-E 1 generation pipeline
def generate_dalle_v1(text_prompt: str):
    # Encode text: 256 tokens max
    text_tokens = text_tokenizer.encode(text_prompt)

    # Autoregressively generate 1024 image tokens
    all_tokens = text_tokens
    for _ in range(1024):
        logits = transformer(all_tokens)
        next_token = sample(logits[-1])
        all_tokens.append(next_token)

    # Decode image tokens back to pixels
    image_tokens = all_tokens[len(text_tokens):]
    return vqvae_decoder(image_tokens)
```

## Autoregressive vs. Diffusion

| Aspect | Autoregressive | Diffusion |
|--------|---------------|-----------|
| Generation speed | Slow (sequential) | Faster (parallel steps) |
| Quality | Good | Better |
| Global coherence | Excellent (attends to all previous) | Good |
| Editability | Hard | Easy (inpainting, etc.) |
| Training | Standard NLL | Score matching |

Autoregressive models excel at global structure; diffusion models at local texture quality.

## Key Takeaways

- Autoregressive models predict each pixel/token conditioned on all previous ones
- PixelCNN is elegant but too slow for high-resolution images (sequential pixel prediction)
- VQ-VAE tokenizes images into a small grid of discrete codes, enabling fast AR generation
- VQGAN adds adversarial and perceptual losses for higher-fidelity reconstruction
- DALL-E 1 combined VQVAE tokenization with transformer-based autoregressive generation
