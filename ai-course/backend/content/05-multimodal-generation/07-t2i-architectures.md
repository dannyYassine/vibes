---
title: "T2I: Diffusion Architectures (U-Net, DiT)"
description: "U-Net and Diffusion Transformer architectures for text-to-image generation"
duration_minutes: 15
order: 7
---

## Two Paths: U-Net vs. Transformer

Modern T2I diffusion models use one of two architectures:

1. **U-Net** (Stable Diffusion 1/2, SDXL): convolutional backbone with attention
2. **DiT (Diffusion Transformer)** (Stable Diffusion 3, FLUX, Sora): pure transformer

## The Latent Diffusion U-Net

Stable Diffusion's U-Net operates in latent space on 64×64×4 feature maps (for 512×512 images):

```python
import torch
import torch.nn as nn

class ResBlock(nn.Module):
    """Residual block with timestep conditioning."""
    def __init__(self, in_channels, out_channels, time_embed_dim):
        super().__init__()
        self.norm1 = nn.GroupNorm(32, in_channels)
        self.conv1 = nn.Conv2d(in_channels, out_channels, 3, padding=1)
        self.norm2 = nn.GroupNorm(32, out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, 3, padding=1)

        # Timestep projection
        self.time_proj = nn.Linear(time_embed_dim, out_channels)

        self.skip = (
            nn.Conv2d(in_channels, out_channels, 1)
            if in_channels != out_channels else nn.Identity()
        )

    def forward(self, x, t_emb):
        h = self.conv1(nn.functional.silu(self.norm1(x)))
        # Add timestep embedding
        h = h + self.time_proj(nn.functional.silu(t_emb))[:, :, None, None]
        h = self.conv2(nn.functional.silu(self.norm2(h)))
        return h + self.skip(x)


class CrossAttention(nn.Module):
    """Cross-attention for text conditioning."""
    def __init__(self, query_dim, context_dim, n_heads=8):
        super().__init__()
        self.n_heads = n_heads
        head_dim = query_dim // n_heads

        self.to_q = nn.Linear(query_dim, query_dim, bias=False)
        self.to_k = nn.Linear(context_dim, query_dim, bias=False)
        self.to_v = nn.Linear(context_dim, query_dim, bias=False)
        self.to_out = nn.Linear(query_dim, query_dim)

    def forward(self, x, context):
        """
        x: image features (B, H*W, C)
        context: text embeddings (B, seq_len, context_dim)
        """
        B, N, C = x.shape
        q = self.to_q(x).view(B, N, self.n_heads, -1).transpose(1, 2)
        k = self.to_k(context).view(B, -1, self.n_heads, -1).transpose(1, 2)
        v = self.to_v(context).view(B, -1, self.n_heads, -1).transpose(1, 2)

        attn = torch.softmax(q @ k.transpose(-2, -1) / (q.size(-1) ** 0.5), dim=-1)
        out = (attn @ v).transpose(1, 2).reshape(B, N, C)
        return self.to_out(out)


class UNetBlock(nn.Module):
    """U-Net block: ResBlock + Self-Attention + Cross-Attention."""
    def __init__(self, channels, time_embed_dim, context_dim):
        super().__init__()
        self.res = ResBlock(channels, channels, time_embed_dim)
        self.self_attn = nn.MultiheadAttention(channels, 8, batch_first=True)
        self.cross_attn = CrossAttention(channels, context_dim)

    def forward(self, x, t_emb, text_context):
        # Residual + timestep
        x = self.res(x, t_emb)
        # Flatten spatial dims for attention
        B, C, H, W = x.shape
        x_flat = x.view(B, C, H*W).transpose(1, 2)  # (B, H*W, C)
        # Self-attention (image features attend to each other)
        x_flat, _ = self.self_attn(x_flat, x_flat, x_flat)
        # Cross-attention (image features attend to text)
        x_flat = x_flat + self.cross_attn(x_flat, text_context)
        return x_flat.transpose(1, 2).view(B, C, H, W)
```

## Timestep Embedding

Timestep t is embedded as a sinusoidal positional encoding, then projected:

```python
class TimestepEmbedding(nn.Module):
    def __init__(self, dim, max_period=10000):
        super().__init__()
        self.dim = dim
        self.mlp = nn.Sequential(
            nn.Linear(dim, dim * 4),
            nn.SiLU(),
            nn.Linear(dim * 4, dim * 4),
        )

    def forward(self, t):
        half = self.dim // 2
        freqs = torch.exp(
            -torch.log(torch.tensor(10000.0)) * torch.arange(half) / half
        )
        args = t[:, None].float() * freqs[None]
        embedding = torch.cat([torch.cos(args), torch.sin(args)], dim=-1)
        return self.mlp(embedding)
```

## DiT: Diffusion Transformer

DiT (Peebles & Xie, 2023) replaces the U-Net entirely with a Vision Transformer (ViT):

```
Image patches → patchify → transformer blocks → unpatchify → noise prediction
```

```python
class DiTBlock(nn.Module):
    """
    DiT block with adaptive layer normalization (adaLN-Zero).
    Conditions on timestep and label (or text) via scale/shift parameters.
    """
    def __init__(self, hidden_size, n_heads):
        super().__init__()
        self.norm1 = nn.LayerNorm(hidden_size, elementwise_affine=False)
        self.attn = nn.MultiheadAttention(hidden_size, n_heads, batch_first=True)
        self.norm2 = nn.LayerNorm(hidden_size, elementwise_affine=False)
        self.ff = nn.Sequential(
            nn.Linear(hidden_size, hidden_size * 4),
            nn.GELU(),
            nn.Linear(hidden_size * 4, hidden_size),
        )
        # adaLN: predict scale and shift from conditioning
        self.adaLN = nn.Sequential(
            nn.SiLU(),
            nn.Linear(hidden_size, 6 * hidden_size),  # 6 params: shift/scale for pre-attn, pre-ff, post
        )

    def forward(self, x, conditioning):
        # Predict 6 modulation parameters from conditioning (t + text)
        shift_msa, scale_msa, gate_msa, shift_mlp, scale_mlp, gate_mlp = (
            self.adaLN(conditioning).chunk(6, dim=1)
        )
        # Modulated attention
        x_norm = self.norm1(x) * (1 + scale_msa[:, None]) + shift_msa[:, None]
        attn_out, _ = self.attn(x_norm, x_norm, x_norm)
        x = x + gate_msa[:, None] * attn_out

        # Modulated feed-forward
        x_norm = self.norm2(x) * (1 + scale_mlp[:, None]) + shift_mlp[:, None]
        x = x + gate_mlp[:, None] * self.ff(x_norm)
        return x
```

## MM-DiT: Stable Diffusion 3

SD3 uses **Multi-Modal DiT** where text and image tokens are processed jointly in shared transformer layers:

```python
# MM-DiT: bidirectional attention between text and image tokens
# Both text and image tokens update each other in every layer
# Results in much stronger text-image alignment than cross-attention

# Architecture:
# 1. Image: patchify latent → image tokens
# 2. Text: encode with T5-XXL and CLIP → text tokens
# 3. Concatenate [image_tokens, text_tokens]
# 4. Run through shared transformer layers (bidirectional attention)
# 5. Unpatchify to get noise prediction
```

## U-Net vs. DiT Comparison

| Aspect | U-Net | DiT / MM-DiT |
|--------|-------|-------------|
| Backbone | Convolutional | Transformer |
| Scaling | Limited | Excellent (ViT scaling laws) |
| Text alignment | Cross-attention | Joint attention (MM-DiT) |
| Models | SD 1.5, SDXL | SD3, FLUX, Sora |
| Inductive bias | Spatial locality | Global context |

DiT scales more predictably with model size and has become the dominant architecture.

## Key Takeaways

- U-Net uses conv blocks + cross-attention for text, operates hierarchically
- Text is injected via cross-attention: image features query text context
- Timestep is embedded as sinusoidal frequencies and injected via AdaGN
- DiT replaces U-Net with a ViT: patchify → transformer → unpatchify
- MM-DiT processes text and image tokens jointly for stronger alignment
