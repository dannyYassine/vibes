---
title: "T2I: Data Preparation"
description: "Curating large-scale image-text datasets for text-to-image training: filtering, captioning, and quality control"
duration_minutes: 13
order: 6
---

## The T2I Data Challenge

Text-to-image models require billions of (image, caption) pairs. Unlike text pretraining data (publicly available web text), paired image-text data requires:
1. Collecting images with associated text
2. Filtering low-quality images and mismatched pairs
3. Improving caption quality (alt-text is often poor)
4. Safety filtering

## Data Sources

### Web-Scraped Alt-Text Data

The largest datasets come from web scraping:

```python
# Common Crawl pipeline
# 1. Download Common Crawl WARC files
# 2. Extract <img> tags with alt text
# 3. Filter and download images

import re
from urllib.parse import urljoin

def extract_image_text_pairs(html_content: str, base_url: str) -> list[dict]:
    """Extract image-alt_text pairs from HTML."""
    # Simple regex (use BeautifulSoup in production)
    img_pattern = r'<img[^>]+src=["\']([^"\']+)["\'][^>]*alt=["\']([^"\']+)["\']'
    pairs = []
    for match in re.finditer(img_pattern, html_content, re.IGNORECASE):
        src, alt_text = match.groups()
        alt_text = alt_text.strip()

        # Basic quality filter
        if len(alt_text) < 5 or len(alt_text) > 500:
            continue
        if alt_text.lower() in {"image", "photo", "img", "banner", "logo"}:
            continue

        pairs.append({
            "url": urljoin(base_url, src),
            "caption": alt_text,
        })
    return pairs
```

Major datasets: LAION-5B (5.85B pairs), COYO-700M, DataComp.

### Image Quality Filtering

```python
from PIL import Image
import io

def filter_image(image_bytes: bytes, min_size=256, min_aspect=0.5) -> bool:
    """Filter out low-quality images."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception:
        return False

    # Size filter
    w, h = img.size
    if w < min_size or h < min_size:
        return False

    # Aspect ratio filter (no extreme panoramas or thin banners)
    aspect = min(w, h) / max(w, h)
    if aspect < min_aspect:
        return False

    # Not grayscale
    if img.mode not in {"RGB", "RGBA"}:
        return False

    return True


def compute_image_quality_score(image_bytes: bytes) -> float:
    """Estimate image quality using CLIP aesthetic predictor."""
    # In practice: use LAION's aesthetic predictor model
    # Returns score 0-10; filter below 4.5 for high-quality subset
    aesthetic_score = aesthetic_predictor(image_bytes)
    return aesthetic_score
```

## CLIP Filtering for Text-Image Alignment

CLIP scores measure how well a caption matches its image. Low CLIP scores indicate mismatched pairs:

```python
import torch
from transformers import CLIPProcessor, CLIPModel

class CLIPFilter:
    def __init__(self):
        self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

    def clip_score(self, image, text: str) -> float:
        """Compute cosine similarity between image and text embeddings."""
        inputs = self.processor(
            text=[text], images=[image], return_tensors="pt", padding=True
        )
        outputs = self.model(**inputs)

        image_emb = outputs.image_embeds / outputs.image_embeds.norm(dim=-1, keepdim=True)
        text_emb = outputs.text_embeds / outputs.text_embeds.norm(dim=-1, keepdim=True)

        return (image_emb @ text_emb.T).item()

    def filter_dataset(self, pairs: list[dict], threshold=0.28) -> list[dict]:
        """Keep only pairs with CLIP score above threshold."""
        return [
            pair for pair in pairs
            if self.clip_score(pair["image"], pair["caption"]) > threshold
        ]
```

Filtering LAION-5B at CLIP threshold 0.28 reduces it to ~2.3B high-quality pairs.

## Caption Improvement with LLMs

Web alt-text is often short and low quality: "img.jpg", "product photo", "see image". LLM recaptioning dramatically improves model quality:

```python
RECAPTION_PROMPT = """You are an image captioner. Write a detailed, accurate description of this image suitable for training an image generation model.

Include:
- Main subjects and their appearance
- Actions or poses
- Scene/setting/background
- Lighting and mood
- Style (photographic, illustrated, etc.)

Be specific and descriptive. Write 1-3 sentences."""

async def recaption_with_vlm(image, original_caption: str, vlm_client) -> str:
    """Use a vision-language model to write better captions."""
    response = await vlm_client.messages.create(
        model="claude-opus-4-6",
        max_tokens=200,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                              "data": encode_image(image)}},
                {"type": "text", "text": RECAPTION_PROMPT},
            ],
        }],
    )
    return response.content[0].text
```

DALL-E 3, SD3, and similar models all use recaptioning pipelines to improve data quality.

## Safety Filtering

```python
class SafetyFilter:
    def __init__(self):
        self.nsfw_classifier = load_nsfw_classifier()
        self.watermark_detector = load_watermark_detector()

    def is_safe(self, image, caption: str) -> bool:
        # NSFW detection
        if self.nsfw_classifier.is_nsfw(image):
            return False

        # Personal identifiable information in caption
        pii_patterns = [r"\b\d{3}-\d{2}-\d{4}\b", r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"]
        for pattern in pii_patterns:
            if re.search(pattern, caption, re.IGNORECASE):
                return False

        # Watermark detection (watermarked training data degrades quality)
        if self.watermark_detector.has_watermark(image):
            return False

        return True
```

## Data Curation Pipeline Summary

```
Raw web crawl (100B+ URLs)
    ↓ URL deduplication
    ↓ Image download + format validation
    ↓ Resolution filter (≥256px)
    ↓ Aspect ratio filter
    ↓ CLIP score filter (removes mismatched pairs)
    ↓ Aesthetic score filter (optional, high-quality subset)
    ↓ NSFW + safety filter
    ↓ Deduplication (perceptual hash, embedding similarity)
    ↓ LLM recaptioning (optional but high-impact)
Final dataset: 1-5B high-quality pairs
```

## Key Takeaways

- T2I datasets come primarily from web-scraped image-alt-text pairs
- CLIP filtering removes mismatched image-text pairs (most impactful quality step)
- Aesthetic scoring filters for visually appealing images
- LLM recaptioning dramatically improves caption quality over raw alt-text
- Safety filtering removes NSFW content, watermarks, and PII
