---
title: "T2V: LDM and Compression Networks"
description: "Extending latent diffusion to video: temporal compression, 3D VAE, and spatial-temporal representations"
duration_minutes: 13
order: 11
---

## From Image to Video Diffusion

Video is a sequence of temporally correlated frames. The simplest extension of image diffusion to video: treat each frame independently. But this produces **temporal flickering** — frames are visually inconsistent.

True video diffusion models learn to generate temporally coherent sequences by:
1. Processing temporal dimension jointly in the architecture
2. Training on video data to learn motion and dynamics
3. Using 3D (spatial + temporal) compression

## The Computational Challenge

A 5-second video at 24fps, 512×512 resolution:
```
Pixels: 5 × 24 × 512 × 512 × 3 = 944M values
Latent (8× spatial, 4× temporal compression): 5 × 6 × 64 × 64 × 4 = 4.9M values
```

Without compression, training on video is ~200× more expensive than images. The VAE and tokenization strategy are critical.

## 3D VAE for Video Compression

Image VAEs compress spatial dimensions (H×W → H/8 × W/8). Video VAEs also compress the temporal dimension:

```python
import torch
import torch.nn as nn

class CausalConv3D(nn.Module):
    """
    3D convolution with causal padding in the temporal dimension.
    Only attends to current and past frames (for autoregressive video generation).
    """
    def __init__(self, in_channels, out_channels, kernel_size=(3, 3, 3)):
        super().__init__()
        t_pad = kernel_size[0] - 1
        s_pad = kernel_size[1] // 2
        self.pad = nn.ConstantPad3d((s_pad, s_pad, s_pad, s_pad, t_pad, 0), 0)
        self.conv = nn.Conv3d(in_channels, out_channels, kernel_size, padding=0)

    def forward(self, x):
        # x: (B, C, T, H, W)
        return self.conv(self.pad(x))


class VideoVAE(nn.Module):
    """
    Video VAE: compresses (T, H, W) video to latent (T/4, H/8, W/8) by default.
    Used in CogVideoX, Open-Sora, and similar models.
    """
    def __init__(self, in_channels=3, latent_channels=16):
        super().__init__()
        # Encoder: spatial 8× + temporal 4× compression
        self.encoder = nn.Sequential(
            CausalConv3D(in_channels, 128, (1, 3, 3)),  # No temporal downsampling yet
            nn.SiLU(),
            CausalConv3D(128, 256, (3, 3, 3)),
            TemporalDownsample(),          # T → T/2
            SpatialDownsample(),           # H,W → H/2, W/2
            CausalConv3D(256, 512, (3, 3, 3)),
            TemporalDownsample(),          # T/2 → T/4
            SpatialDownsample(),           # H/2,W/2 → H/4, W/4
            SpatialDownsample(),           # → H/8, W/8
        )
        self.to_mu = nn.Conv3d(512, latent_channels, 1)
        self.to_logvar = nn.Conv3d(512, latent_channels, 1)

        self.decoder = nn.Sequential(
            # Symmetric upsampling
            CausalConv3D(latent_channels, 512, (3, 3, 3)),
            TemporalUpsample(),
            SpatialUpsample(),
            CausalConv3D(512, 256, (3, 3, 3)),
            TemporalUpsample(),
            SpatialUpsample(),
            SpatialUpsample(),
            CausalConv3D(256, in_channels, (1, 3, 3)),
            nn.Tanh(),
        )

    def encode(self, x):
        h = self.encoder(x)
        return self.to_mu(h), self.to_logvar(h)

    def decode(self, z):
        return self.decoder(z)
```

## Tokenization Approaches

Video models tokenize differently based on the downstream architecture:

```python
# Approach 1: 2D VAE (image-by-image) + temporal attention in diffusion model
# - Simplest: reuse existing image VAE
# - Each frame compressed independently
# - Temporal coherence handled by the diffusion model
# - Used in: AnimateDiff, ModelScope T2V

def encode_video_2d_vae(frames: torch.Tensor, image_vae) -> torch.Tensor:
    B, T, C, H, W = frames.shape
    frames_flat = frames.view(B * T, C, H, W)
    latents = image_vae.encode(frames_flat).latent_dist.sample()
    return latents.view(B, T, *latents.shape[1:])


# Approach 2: 3D VAE with temporal compression
# - Compresses both spatial and temporal dimensions
# - More efficient, better temporal coherence
# - Used in: CogVideoX, Wan, HunyuanVideo
def encode_video_3d_vae(video: torch.Tensor, video_vae: VideoVAE) -> torch.Tensor:
    # video: (B, C, T, H, W)
    mu, logvar = video_vae.encode(video)
    std = torch.exp(0.5 * logvar)
    return mu + std * torch.randn_like(std)
```

## Latent Space Structure for Video

The latent representation used by the diffusion model:

```
Image latent:  (B, C, H/8, W/8)
               e.g., (1, 4, 64, 64) for 512×512 image

Video latent:  (B, C, T/4, H/8, W/8)
               e.g., (1, 16, 12, 64, 64) for 5s×24fps=120 frames → 30 latent frames
               at 512×512 resolution
```

The diffusion model then denoises this 5D tensor.

## Pretrained Image VAE → Video VAE Conversion

A common technique: initialize a 3D video VAE from a pretrained 2D image VAE:

```python
def inflate_2d_conv_to_3d(conv2d: nn.Conv2d, temporal_kernel_size: int = 3) -> CausalConv3D:
    """
    Inflate 2D conv weights to 3D by inserting a temporal dimension.
    Central slice of temporal kernel = 2D weights; others = 0 (initially).
    """
    out_c, in_c, kh, kw = conv2d.weight.shape
    new_weight = torch.zeros(out_c, in_c, temporal_kernel_size, kh, kw)
    # Initialize: temporal center = original 2D weights, others = 0
    new_weight[:, :, temporal_kernel_size // 2, :, :] = conv2d.weight
    conv3d = CausalConv3D(in_c, out_c, (temporal_kernel_size, kh, kw))
    conv3d.conv.weight.data = new_weight
    return conv3d
```

This initialization means the 3D model starts by processing each frame independently (same as 2D), then fine-tunes to learn temporal modeling.

## Key Takeaways

- Video diffusion needs both spatial and temporal compression to be computationally feasible
- 3D VAEs compress (T, H, W) jointly; 2D VAEs process frames independently then use temporal attention
- Causal 3D convolutions ensure temporal consistency without attending to future frames
- 3D VAE latents have shape (B, C, T/4, H/8, W/8) — ~50× compressed from raw video
- 2D-to-3D weight inflation allows initializing video VAEs from pretrained image VAEs
