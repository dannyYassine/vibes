---
title: "T2V: DiT Architecture for Videos"
description: "Spatial-temporal attention, 3D DiT blocks, and patchification strategies for video generation"
duration_minutes: 14
order: 13
---

## Extending DiT to Video

The Diffusion Transformer (DiT) extends naturally to video by treating video as a 3D (T × H × W) tensor to patchify. The key architectural choices:

1. **Patchification**: how to divide the video into tokens
2. **Attention pattern**: full 3D, factorized, or sliding window
3. **Temporal conditioning**: how to encode position in time
4. **Text conditioning**: same as image (cross-attention or MM-DiT)

## 3D Patchification

```python
import torch
import torch.nn as nn

class Video3DPatchEmbed(nn.Module):
    """
    Patchify video into spatial-temporal tokens.
    patch_size = (temporal, height, width)
    """
    def __init__(
        self,
        patch_size=(1, 2, 2),   # 1 temporal, 2×2 spatial
        in_channels=16,          # VAE latent channels
        embed_dim=1152,
    ):
        super().__init__()
        self.patch_size = patch_size
        # 3D conv = patchify operation
        self.proj = nn.Conv3d(
            in_channels, embed_dim,
            kernel_size=patch_size, stride=patch_size
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: (B, C, T, H, W) video latent
        Returns: (B, N, embed_dim) sequence of patch tokens
        N = (T/pt) × (H/ph) × (W/pw)
        """
        B, C, T, H, W = x.shape
        pt, ph, pw = self.patch_size
        x = self.proj(x)  # (B, embed_dim, T/pt, H/ph, W/pw)
        x = x.flatten(2).transpose(1, 2)  # (B, N, embed_dim)
        return x
```

For a 5-second video at 24fps with 4× temporal VAE compression → 30 latent frames:
- Latent shape: (B, 16, 30, 64, 64)
- Patch size (1, 2, 2): 30 × 32 × 32 = 30,720 tokens
- Patch size (2, 2, 2): 15 × 32 × 32 = 15,360 tokens

## 3D Positional Embeddings (RoPE-3D)

Extend rotary position embeddings to 3D:

```python
def get_3d_rope_freqs(
    seq_len_t: int, seq_len_h: int, seq_len_w: int,
    dim: int,
) -> torch.Tensor:
    """
    Compute 3D RoPE frequencies for temporal, height, and width dimensions.
    Each dimension gets 1/3 of the embedding dimension.
    """
    dim_per_axis = dim // 3

    # Frequencies for each axis
    freqs_t = get_1d_freqs(seq_len_t, dim_per_axis)  # (T, dim/3)
    freqs_h = get_1d_freqs(seq_len_h, dim_per_axis)  # (H, dim/3)
    freqs_w = get_1d_freqs(seq_len_w, dim_per_axis)  # (W, dim/3)

    # Broadcast and interleave across the T×H×W grid
    # Returns: (T*H*W, dim) — one embedding per spatial-temporal position
    freqs = torch.cat([
        freqs_t.unsqueeze(1).unsqueeze(1).expand(-1, seq_len_h, seq_len_w, -1),
        freqs_h.unsqueeze(0).unsqueeze(2).expand(seq_len_t, -1, seq_len_w, -1),
        freqs_w.unsqueeze(0).unsqueeze(0).expand(seq_len_t, seq_len_h, -1, -1),
    ], dim=-1).view(-1, dim)

    return freqs
```

## Factorized Spatial-Temporal Attention

Full 3D attention over all T×H×W tokens is expensive. Factorized attention processes spatial and temporal dimensions separately:

```python
class FactorizedSpatioTemporalBlock(nn.Module):
    """
    Alternates between spatial attention (within each frame)
    and temporal attention (across frames at each spatial position).
    Much cheaper than full 3D attention.
    """
    def __init__(self, hidden_size: int, n_heads: int):
        super().__init__()
        self.spatial_attn = nn.MultiheadAttention(hidden_size, n_heads, batch_first=True)
        self.temporal_attn = nn.MultiheadAttention(hidden_size, n_heads, batch_first=True)
        self.norm1 = nn.LayerNorm(hidden_size)
        self.norm2 = nn.LayerNorm(hidden_size)
        self.ff = nn.Sequential(
            nn.Linear(hidden_size, hidden_size * 4),
            nn.GELU(),
            nn.Linear(hidden_size * 4, hidden_size),
        )
        self.norm3 = nn.LayerNorm(hidden_size)

    def forward(self, x: torch.Tensor, T: int, H: int, W: int) -> torch.Tensor:
        """x: (B, T*H*W, C)"""
        B, N, C = x.shape

        # === Spatial attention: each frame independently ===
        # Reshape: (B*T, H*W, C)
        x_spatial = x.view(B * T, H * W, C)
        x_spatial, _ = self.spatial_attn(x_spatial, x_spatial, x_spatial)
        x = x + self.norm1(x_spatial.view(B, N, C))

        # === Temporal attention: each spatial position across frames ===
        # Reshape: (B*H*W, T, C)
        x_temporal = x.view(B, T, H * W, C).permute(0, 2, 1, 3).reshape(B * H * W, T, C)
        x_temporal, _ = self.temporal_attn(x_temporal, x_temporal, x_temporal)
        x_temporal = x_temporal.view(B, H * W, T, C).permute(0, 2, 1, 3).reshape(B, N, C)
        x = x + self.norm2(x_temporal)

        # Feed-forward
        x = x + self.norm3(self.ff(x))
        return x
```

**Complexity comparison**:
- Full 3D attention: O((T×H×W)²) = O(N²) for N tokens
- Factorized: O(T × (H×W)² + H×W × T²) ≈ O(N^1.5)

## Full 3D Attention (Wan, HunyuanVideo)

State-of-the-art models like HunyuanVideo use full 3D attention with causal temporal masking:

```python
class Full3DAttention(nn.Module):
    """
    Full attention over all spatial-temporal tokens.
    With causal masking: each frame only attends to previous frames.
    Memory-intensive but highest quality.
    """
    def __init__(self, hidden_size, n_heads):
        super().__init__()
        self.attn = nn.MultiheadAttention(hidden_size, n_heads, batch_first=True)

    def forward(self, x, T, H, W, causal=True):
        N = T * H * W
        B = x.size(0)

        if causal:
            # Build causal mask: frame t can attend to frames 0..t
            # Each frame has H*W tokens
            mask = torch.zeros(N, N, dtype=torch.bool)
            for t1 in range(T):
                for t2 in range(t1 + 1, T):
                    start2, end2 = t2 * H * W, (t2 + 1) * H * W
                    start1, end1 = t1 * H * W, (t1 + 1) * H * W
                    mask[start1:end1, start2:end2] = True  # Block future frames
        else:
            mask = None

        x, _ = self.attn(x, x, x, attn_mask=mask)
        return x
```

## Architecture Summary: Major Video Models

| Model | Architecture | Attention | Temporal |
|-------|-------------|-----------|---------|
| AnimateDiff | U-Net + temporal modules | Factorized | Added to image U-Net |
| VideoLDM | U-Net | Factorized | Temporal attention layers |
| Open-Sora | DiT | Full 3D | Non-causal |
| CogVideoX | DiT (MM-DiT) | Full 3D | Expert-Adaptive |
| Wan | DiT | Full 3D | RoPE-3D |
| HunyuanVideo | DiT | Full 3D causal | 3D RoPE |

## Key Takeaways

- 3D patchification creates spatial-temporal tokens from video latents
- 3D RoPE encodes position across time, height, and width separately
- Factorized attention (spatial then temporal) is cheaper but less expressive than full 3D
- Full 3D attention with causal masking is used by state-of-the-art models
- MM-DiT joint text-video attention gives stronger text alignment than cross-attention
