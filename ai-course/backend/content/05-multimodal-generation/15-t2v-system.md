---
title: "T2V: Overall System"
description: "End-to-end text-to-video system design: inference pipeline, prompt understanding, and production considerations"
duration_minutes: 12
order: 15
---

## The Full T2V Pipeline

A production text-to-video system involves much more than just the diffusion model:

```
User Text Prompt
    ↓
[Prompt Enhancement] → Expand short prompts, add technical details
    ↓
[Text Encoding] → T5-XXL + CLIP → text embeddings
    ↓
[Diffusion Model] → Video DiT with CFG
    ↓
[Video Decoder] → 3D VAE decode latents to frames
    ↓
[Video Post-processing] → Interpolation, super-resolution
    ↓
Final Video
```

## Prompt Enhancement

Short user prompts produce mediocre videos. A prompt enhancer rewrites them for the model:

```python
async def enhance_video_prompt(user_prompt: str, client) -> str:
    """
    Expand a short user prompt into a detailed video description.
    """
    system = """You are a video prompt engineer. Convert user prompts into detailed video descriptions for a text-to-video model.

Include:
- Camera movement (static, slow pan, zoom in/out, tracking shot, handheld)
- Lighting (golden hour, soft diffuse, dramatic shadows, studio lighting)
- Visual style (photorealistic, cinematic, documentary, animation)
- Motion description (smooth, dynamic, slow motion)
- Scene details (background, atmosphere, time of day)

Keep descriptions under 200 words. Be specific."""

    response = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=300,
        system=system,
        messages=[{"role": "user", "content": f"Enhance this video prompt: {user_prompt}"}],
    )
    return response.content[0].text


# Example:
# Input:  "a cat playing with a ball"
# Output: "A fluffy orange tabby cat playfully batting a red rubber ball
#          across a sun-drenched hardwood floor. Slow tracking shot follows
#          the cat's movements, with warm afternoon light casting long shadows.
#          Cinematic style, shallow depth of field, photorealistic. The cat's
#          fur catches the light as it pounces and chases."
```

## Inference Architecture

```python
import torch
import asyncio

class T2VInferencePipeline:
    def __init__(
        self,
        text_encoder,      # T5-XXL
        clip_encoder,      # CLIP
        dit_model,         # Video DiT
        video_vae,         # 3D VAE decoder
        scheduler,         # Flow matching / DDIM scheduler
    ):
        self.text_encoder = text_encoder
        self.clip_encoder = clip_encoder
        self.dit = dit_model
        self.vae = video_vae
        self.scheduler = scheduler

    @torch.no_grad()
    def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        num_frames: int = 81,        # ~5 seconds at 16fps
        height: int = 480,
        width: int = 832,
        guidance_scale: float = 6.0,
        num_inference_steps: int = 50,
        seed: int = None,
    ) -> torch.Tensor:

        if seed is not None:
            torch.manual_seed(seed)

        # 1. Encode text
        t5_emb = self.text_encoder.encode(prompt)       # (1, 512, 4096)
        clip_emb = self.clip_encoder.encode(prompt)     # (1, 768)
        t5_null = self.text_encoder.encode(negative_prompt)
        clip_null = self.clip_encoder.encode(negative_prompt)

        # 2. Compute latent dimensions
        lat_t = (num_frames - 1) // 4 + 1  # Temporal VAE factor = 4
        lat_h = height // 8
        lat_w = width // 8
        latent_shape = (1, 16, lat_t, lat_h, lat_w)

        # 3. Initialize random noise
        latents = torch.randn(latent_shape)

        # 4. Denoising loop
        self.scheduler.set_timesteps(num_inference_steps)
        for t in self.scheduler.timesteps:
            # CFG: run model twice
            noise_cond = self.dit(latents, t, t5_emb, clip_emb)
            noise_uncond = self.dit(latents, t, t5_null, clip_null)
            noise_pred = noise_uncond + guidance_scale * (noise_cond - noise_uncond)

            # Update latents
            latents = self.scheduler.step(noise_pred, t, latents).prev_sample

        # 5. Decode latents to video frames
        video = self.vae.decode(latents)  # (1, C, T, H, W)

        # Normalize to [0, 255]
        video = ((video + 1) * 0.5).clamp(0, 1) * 255
        return video.byte()
```

## Video Post-Processing

Raw diffusion outputs benefit from additional enhancement:

```python
class VideoPostProcessor:
    def __init__(self):
        self.interpolator = VideoInterpolator()   # RIFE for frame interpolation
        self.upsampler = VideoSuperRes()          # Real-ESRGAN for upscaling

    def enhance(
        self,
        frames: torch.Tensor,   # (T, C, H, W) at 16fps, 480p
        target_fps: int = 24,
        target_resolution: tuple = (1080, 1920),
    ) -> torch.Tensor:

        # 1. Frame interpolation: 16fps → 24fps
        frames = self.interpolator.interpolate(frames, target_fps=target_fps)

        # 2. Super-resolution: 480p → 1080p
        frames = self.upsampler.upscale(frames, target_resolution)

        return frames
```

## Serving at Scale

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio

app = FastAPI()

# GPU job queue for handling concurrent requests
generation_queue = asyncio.Queue()


@app.post("/generate")
async def generate_video(request: dict):
    """
    Video generation endpoint with SSE progress streaming.
    """
    async def event_stream():
        job_id = create_job_id()

        yield f"data: {json.dumps({'status': 'queued', 'job_id': job_id})}\n\n"

        # Enhance prompt
        enhanced = await enhance_video_prompt(request["prompt"])
        yield f"data: {json.dumps({'status': 'enhancing', 'enhanced_prompt': enhanced})}\n\n"

        # Generation (runs on GPU worker)
        yield f"data: {json.dumps({'status': 'generating', 'progress': 0})}\n\n"

        # Stream progress updates during inference
        for step in range(request.get("num_steps", 50)):
            await asyncio.sleep(0.5)  # GPU inference
            progress = (step + 1) / 50 * 100
            yield f"data: {json.dumps({'status': 'generating', 'progress': progress})}\n\n"

        # Upload to storage
        video_url = await upload_to_storage(generated_video)
        yield f"data: {json.dumps({'status': 'complete', 'video_url': video_url})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

## Current State of T2V Models (2025)

| Model | Resolution | Duration | Quality |
|-------|-----------|---------|---------|
| Sora (OpenAI) | Up to 1080p | Up to 60s | Best |
| Wan 2.1 (Alibaba) | Up to 1080p | ~5-10s | Excellent |
| HunyuanVideo (Tencent) | Up to 720p | ~5s | Very Good |
| CogVideoX-5B (Zhipu) | 720p | ~6s | Good |
| Mochi-1 (Genmo) | 480p | ~5s | Good |

## Key Takeaways

- Production T2V systems chain: prompt enhancement → text encoding → DiT denoising → VAE decode
- Prompt enhancement LLMs dramatically improve output quality for short user prompts
- CFG requires two forward passes; guidance scale 5-7 works well for video
- Post-processing (interpolation to 24fps, super-resolution) improves perceived quality
- Streaming SSE responses allow showing progress during long generation jobs
