---
title: "T2V: Data Preparation"
description: "Collecting, filtering, and captioning video datasets for text-to-video training"
duration_minutes: 12
order: 12
---

## The Video Data Problem

Video data is orders of magnitude harder to curate than image data:
- **Volume**: a 5-minute video = 7,200 frames = 7,200 images
- **Caption quality**: video alt-text is nearly non-existent
- **Temporal filtering**: must detect scene cuts, camera shake, poor lighting
- **Compute**: downloading, decoding, and processing video is expensive

## Video Data Sources

### Web Video

YouTube, Vimeo, and other platforms contain billions of hours of video. Common scraping approaches:

```python
# WebVid-10M: 10M video-caption pairs from stock video websites
# HD-VG-130M: 130M video clips from the web
# InternVid: 234M clips with CLIP-based captions

# Ethical note: Web scraping must respect robots.txt and ToS
# Many research datasets use CC-licensed content

import yt_dlp  # YouTube downloader

def download_video_clip(url: str, output_path: str, max_duration_sec=30) -> bool:
    """Download a video clip with duration limit."""
    ydl_opts = {
        "format": "bestvideo[height<=720]+bestaudio/best[height<=720]",
        "outtmpl": output_path,
        "match_filter": yt_dlp.utils.match_filter_func(f"duration < {max_duration_sec}"),
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            ydl.download([url])
            return True
        except Exception:
            return False
```

## Shot Detection and Segmentation

Raw videos must be segmented into coherent clips. A clip that spans a scene cut will confuse the model:

```python
import cv2
import numpy as np

def detect_scene_cuts(video_path: str, threshold: float = 0.4) -> list[int]:
    """
    Detect frame indices where scene cuts occur.
    Uses histogram difference between consecutive frames.
    """
    cap = cv2.VideoCapture(video_path)
    cut_frames = []
    prev_hist = None
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = cv2.normalize(hist, hist).flatten()

        if prev_hist is not None:
            diff = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_BHATTACHARYYA)
            if diff > threshold:
                cut_frames.append(frame_idx)

        prev_hist = hist
        frame_idx += 1

    cap.release()
    return cut_frames


def segment_into_clips(video_path: str, min_clip_sec=2, max_clip_sec=15) -> list[dict]:
    """Split video into clips at scene cuts."""
    fps = get_fps(video_path)
    cuts = detect_scene_cuts(video_path)
    cuts = [0] + cuts + [get_total_frames(video_path)]

    clips = []
    for i in range(len(cuts) - 1):
        start_frame = cuts[i]
        end_frame = cuts[i + 1]
        duration_sec = (end_frame - start_frame) / fps

        if min_clip_sec <= duration_sec <= max_clip_sec:
            clips.append({
                "start_frame": start_frame,
                "end_frame": end_frame,
                "duration_sec": duration_sec,
            })

    return clips
```

## Video Quality Filtering

```python
def compute_optical_flow_score(frames: list) -> float:
    """
    Estimate motion amount via optical flow.
    Too much motion = shaky camera.
    Too little motion = static video (could just be images).
    """
    prev = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)
    flow_magnitudes = []

    for frame in frames[1::4]:  # Sample every 4 frames for efficiency
        curr = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        flow = cv2.calcOpticalFlowFarneback(
            prev, curr, None, 0.5, 3, 15, 3, 5, 1.2, 0
        )
        magnitude = np.sqrt(flow[..., 0]**2 + flow[..., 1]**2).mean()
        flow_magnitudes.append(magnitude)
        prev = curr

    return np.mean(flow_magnitudes)


def filter_video_clip(frames: list, resolution: tuple) -> bool:
    """Quality filter for a video clip."""
    # Resolution check
    h, w = frames[0].shape[:2]
    if w < 256 or h < 256:
        return False

    # Motion check
    motion = compute_optical_flow_score(frames)
    if motion < 0.5:  # Nearly static
        return False
    if motion > 50:   # Too shaky
        return False

    # Brightness check (too dark or overexposed)
    brightness = np.mean([frame.mean() for frame in frames])
    if brightness < 20 or brightness > 235:
        return False

    return True
```

## Video Captioning with VLMs

Video alt-text is nearly absent on the web. Models require dense, motion-aware captions:

```python
import anthropic
import base64

def caption_video_clip(frames: list, video_metadata: dict) -> str:
    """
    Generate a dense video caption using a vision-language model.
    """
    client = anthropic.Anthropic()

    # Sample frames: first, middle, last + 2 intermediate
    n_frames = len(frames)
    sample_indices = [0, n_frames//4, n_frames//2, 3*n_frames//4, n_frames-1]
    sample_frames = [frames[i] for i in sample_indices]

    # Encode frames as base64
    encoded = []
    for frame in sample_frames:
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        encoded.append(base64.b64encode(buffer).decode())

    content = []
    for b64 in encoded:
        content.append({"type": "image", "source": {
            "type": "base64", "media_type": "image/jpeg", "data": b64
        }})

    content.append({"type": "text", "text": f"""These are {len(sample_frames)} frames from a {video_metadata.get('duration_sec', '?')}-second video clip. Write a detailed caption describing:
1. Main subjects and their actions
2. Camera movement (static, pan, zoom, etc.)
3. Setting and environment
4. Temporal progression (what changes over time)

Write 2-3 sentences, focusing on motion and actions."""})

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": content}],
    )
    return response.content[0].text
```

## Data Pipeline Summary

```
Raw video URLs (100M+)
    ↓ Download + decode
    ↓ Scene cut detection + segmentation
    ↓ Quality filter (resolution, motion, brightness)
    ↓ NSFW + watermark detection
    ↓ CLIP-based quality scoring (frame aesthetics)
    ↓ Deduplication (perceptual video hashing)
    ↓ VLM captioning
Final dataset: 10M-100M clips with dense captions
```

## Key Takeaways

- Video data requires shot segmentation — clips spanning scene cuts confuse models
- Optical flow measures motion: filter out static clips and shake-heavy content
- Web videos almost never have captions — VLM captioning is essential
- Multi-frame captioning captures temporal dynamics that single-frame captions miss
- Production video datasets (InternVid, HD-VG) combine automated filtering with CLIP scoring
