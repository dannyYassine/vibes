---
title: "T2V: Large-scale Training Challenges"
description: "Mixed-resolution training, image-video joint training, and scaling challenges for video generation"
duration_minutes: 14
order: 14
---

## Why Video Training Is Different

Text-to-video training inherits all the challenges of T2I, plus:

- **Variable lengths**: clips range from 1 second to minutes
- **Mixed resolutions**: landscape, portrait, square, different FPS
- **Temporal consistency loss**: standard MSE treats each frame independently
- **Compute**: a 5-second video uses ~120× more memory than a single image

## Joint Image-Video Training

Training purely on video is wasteful — images are cheaper and plentiful. The standard approach: **treat images as 1-frame videos** and train jointly.

```python
class VideoDataset(torch.utils.data.Dataset):
    def __init__(self, video_clips, images, video_weight=0.5):
        self.video_clips = video_clips  # List of video paths with captions
        self.images = images            # List of image paths with captions
        self.video_weight = video_weight  # 50% video, 50% image batches

    def __getitem__(self, idx):
        if torch.rand(1).item() < self.video_weight:
            # Return a video clip
            clip = self.video_clips[idx % len(self.video_clips)]
            frames = load_video_frames(clip["path"])
            return {"frames": frames, "caption": clip["caption"],
                    "is_video": True}
        else:
            # Return an image as single-frame "video"
            img_data = self.images[idx % len(self.images)]
            frame = load_image(img_data["path"])
            return {"frames": frame.unsqueeze(0),  # Add temporal dim
                    "caption": img_data["caption"],
                    "is_video": False}


def training_step(model, batch, schedule):
    frames = batch["frames"]  # (B, T, C, H, W) — T=1 for images

    # Encode to latent
    with torch.no_grad():
        B, T, C, H, W = frames.shape
        latents = video_vae.encode(frames)  # (B, C_lat, T/4, H/8, W/8)

    # Add noise + predict
    t = torch.randint(0, schedule.T, (B,))
    noisy = schedule.add_noise(latents, t)
    text_emb = encode_text(batch["caption"])

    pred = model(noisy, t, text_emb)
    return F.mse_loss(pred, get_target(latents, noisy, t))
```

## Handling Variable-Length Videos

Videos in a batch may have different lengths. Two strategies:

```python
# Strategy 1: Pad to max length (simple but wasteful)
def pad_video_batch(videos: list[torch.Tensor]) -> torch.Tensor:
    max_frames = max(v.size(0) for v in videos)
    padded = []
    for v in videos:
        if v.size(0) < max_frames:
            pad = v[-1:].repeat(max_frames - v.size(0), 1, 1, 1)
            v = torch.cat([v, pad])
        padded.append(v)
    return torch.stack(padded)


# Strategy 2: Dynamic batching — group by similar length
from torch.utils.data import Sampler

class LengthGroupedSampler(Sampler):
    """Group videos of similar length into the same batch."""
    def __init__(self, dataset, batch_size: int):
        self.indices_by_length = self._group_by_length(dataset, batch_size)

    def _group_by_length(self, dataset, batch_size):
        lengths = [len(dataset[i]["frames"]) for i in range(len(dataset))]
        sorted_indices = sorted(range(len(lengths)), key=lambda i: lengths[i])
        # Create batches of similar lengths
        return [
            sorted_indices[i:i+batch_size]
            for i in range(0, len(sorted_indices), batch_size)
        ]

    def __iter__(self):
        import random
        batches = self.indices_by_length.copy()
        random.shuffle(batches)
        return iter([idx for batch in batches for idx in batch])
```

## Mixed-Resolution Training with RoPE

A key challenge: training on 720p, 1080p, 1:1, 9:16 ratios simultaneously. The model must generalize to arbitrary resolutions.

**Solution**: use RoPE positional embeddings (not learned), which naturally extrapolate to unseen resolutions.

```python
def compute_dynamic_rope_freqs(h_patches: int, w_patches: int, t_patches: int, dim: int):
    """
    Dynamic RoPE: compute frequencies for any resolution at inference time.
    The model trained on 64×64 patches can generalize to 80×45 patches.
    """
    freqs_h = get_1d_freqs(h_patches, dim // 3)
    freqs_w = get_1d_freqs(w_patches, dim // 3)
    freqs_t = get_1d_freqs(t_patches, dim // 3)
    return build_3d_freqs(freqs_t, freqs_h, freqs_w)
```

## Flow Matching for Video

Flow matching (used in SD3, FLUX, Wan) is particularly effective for video:

```python
def flow_matching_video_loss(model, x0, text_emb):
    """
    Flow matching objective for video.
    Simpler and more stable than DDPM noise prediction.
    """
    B = x0.size(0)

    # Sample random time t ∈ [0, 1]
    t = torch.rand(B, device=x0.device)

    # Sample noise
    noise = torch.randn_like(x0)

    # Linear interpolation: x_t = t*noise + (1-t)*x0
    t_expanded = t.view(B, 1, 1, 1, 1)
    x_t = t_expanded * noise + (1 - t_expanded) * x0

    # Target velocity: direction from x0 to noise
    v_target = noise - x0

    # Predict velocity
    v_pred = model(x_t, t, text_emb)

    return F.mse_loss(v_pred, v_target)
```

## Temporal Consistency Losses

Standard MSE treats frames independently. Additional losses enforce coherence:

```python
def temporal_consistency_loss(predicted_frames: torch.Tensor) -> torch.Tensor:
    """
    Penalize large differences between consecutive frames.
    Encourages smooth motion.
    """
    # predicted_frames: (B, T, C, H, W)
    frame_diffs = predicted_frames[:, 1:] - predicted_frames[:, :-1]
    return frame_diffs.abs().mean()


def perceptual_video_loss(predicted, target, vgg):
    """Perceptual loss computed frame-by-frame."""
    B, T, C, H, W = predicted.shape
    pred_flat = predicted.view(B * T, C, H, W)
    tgt_flat = target.view(B * T, C, H, W)

    pred_feats = vgg(pred_flat)
    tgt_feats = vgg(tgt_flat)
    return F.l1_loss(pred_feats, tgt_feats)
```

## Compute Requirements

Training video generation models requires significant infrastructure:

| Model Scale | Hardware | Training Time |
|-------------|---------|--------------|
| Small (300M params) | 8× A100 | ~2 weeks |
| Medium (1B params) | 64× H100 | ~4 weeks |
| Large (8B params) | 512× H100 | ~8 weeks |
| Very Large (13B+) | 2048× H100 | months |

Gradient checkpointing, mixed precision (bf16), and Flash Attention are mandatory at these scales.

## Key Takeaways

- Joint image-video training treats images as single-frame videos for efficiency
- Variable-length batching groups clips of similar length to minimize padding waste
- Dynamic RoPE enables training at multiple resolutions and generalizing to new ones
- Flow matching (linear interpolation + velocity prediction) outperforms DDPM for video
- Temporal consistency losses enforce smooth motion between consecutive frames
