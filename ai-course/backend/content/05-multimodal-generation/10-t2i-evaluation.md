---
title: "T2I: Evaluation (IS, FID, CLIP)"
description: "Automatic and human evaluation metrics for image generation quality, diversity, and text-image alignment"
duration_minutes: 12
order: 10
---

## Why Evaluating Generated Images Is Hard

Unlike text (perplexity) or code (tests pass/fail), image quality is multi-dimensional:
- **Fidelity**: does it look like a real photo?
- **Diversity**: does the model cover the full distribution?
- **Text alignment**: does it match the prompt?
- **Aesthetics**: is it visually pleasing?

No single metric captures all dimensions.

## Inception Score (IS)

IS (Salimans et al., 2016) measures two properties using an Inception classifier:
1. **Quality**: each generated image should clearly look like some class (low entropy of p(y|x))
2. **Diversity**: the distribution over classes should be broad (high entropy of p(y))

```python
import torch
import torch.nn.functional as F
from torchvision.models import inception_v3

def compute_inception_score(images: torch.Tensor, n_splits=10) -> tuple[float, float]:
    """
    IS = exp(E_x[KL(p(y|x) || p(y))])
    Higher is better. Range typically 1-11 for ImageNet-like images.
    """
    inception = inception_v3(pretrained=True, transform_input=False).eval()

    with torch.no_grad():
        preds = F.softmax(inception(images), dim=1).cpu().numpy()

    scores = []
    n = len(preds)
    split_size = n // n_splits

    for i in range(n_splits):
        part = preds[i * split_size: (i + 1) * split_size]
        # p(y|x) for each image
        # p(y) = marginal (mean over all images in split)
        p_y = part.mean(axis=0, keepdims=True)  # (1, 1000)

        # KL divergence for each image
        kl = (part * (torch.log(torch.tensor(part) + 1e-10)
                      - torch.log(torch.tensor(p_y) + 1e-10))).sum(axis=1)
        scores.append(torch.exp(kl.mean()).item())

    mean = torch.tensor(scores).mean().item()
    std = torch.tensor(scores).std().item()
    return mean, std

# Limitation: IS uses ImageNet classes — doesn't work for non-photorealistic images
# IS can be gamed: repeat the same 1000 high-quality images to get perfect IS
```

## Fréchet Inception Distance (FID)

FID (Heusel et al., 2017) compares the distribution of real and generated images in Inception feature space:

```python
import numpy as np
from scipy import linalg
from torchvision.models import inception_v3

def extract_inception_features(images: torch.Tensor) -> np.ndarray:
    """Extract 2048-dim features from Inception v3 pool3 layer."""
    inception = inception_v3(pretrained=True)
    inception.fc = torch.nn.Identity()  # Remove classification head
    inception.eval()

    with torch.no_grad():
        features = inception(images).cpu().numpy()
    return features


def compute_fid(real_images: torch.Tensor, gen_images: torch.Tensor) -> float:
    """
    FID = ||μ_r - μ_g||² + Tr(Σ_r + Σ_g - 2(Σ_r Σ_g)^(1/2))

    Lower is better. Perfect FID = 0.
    State-of-the-art T2I models: FID < 5 on benchmark datasets.
    """
    real_feats = extract_inception_features(real_images)
    gen_feats = extract_inception_features(gen_images)

    mu_r, sigma_r = real_feats.mean(0), np.cov(real_feats, rowvar=False)
    mu_g, sigma_g = gen_feats.mean(0), np.cov(gen_feats, rowvar=False)

    # Fréchet distance between two multivariate Gaussians
    diff = mu_r - mu_g
    covmean = linalg.sqrtm(sigma_r @ sigma_g)
    if np.iscomplexobj(covmean):
        covmean = covmean.real

    fid = diff @ diff + np.trace(sigma_r + sigma_g - 2 * covmean)
    return float(fid)

# Need ≥10K images for reliable FID estimates
# FID is most widely used: combines quality AND diversity
```

## CLIP Score: Text-Image Alignment

CLIP score measures how well the generated image matches its text prompt:

```python
from transformers import CLIPModel, CLIPProcessor

def compute_clip_score(images: list, prompts: list[str]) -> float:
    """
    CLIP score = cosine similarity between image and text embeddings.
    Range: ~0.1 (no match) to ~0.35 (strong match).
    """
    model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")

    scores = []
    for image, prompt in zip(images, prompts):
        inputs = processor(text=[prompt], images=[image],
                          return_tensors="pt", padding=True)
        outputs = model(**inputs)

        img_emb = outputs.image_embeds / outputs.image_embeds.norm()
        txt_emb = outputs.text_embeds / outputs.text_embeds.norm()
        score = (img_emb @ txt_emb.T).item()
        scores.append(max(score, 0))  # CLIP score clamps at 0

    return sum(scores) / len(scores)

# CLIP score measures alignment but not quality (a blurry image of a cat
# matching "a cat" gets the same score as a sharp one)
```

## Human Evaluation

Automated metrics don't fully capture human preferences. Human evaluation is the gold standard:

```python
# Common human evaluation paradigms:

# 1. Pairwise comparison (ELO-style)
# Show two images for same prompt, ask which is better
# Used by: DALL-E 3, Midjourney, Stable Diffusion comparisons

# 2. Likert scale ratings
# Rate image quality 1-5 on multiple dimensions:
questions = [
    "Overall quality (1=terrible, 5=excellent)",
    "Does it match the prompt? (1=not at all, 5=perfectly)",
    "Is it photorealistic? (1=not at all, 5=fully)",
    "Is it aesthetically pleasing? (1=not at all, 5=very)",
]

# 3. GenAI-Bench: structured human eval dataset
# 1600 prompts with human ratings
# Tests specific capabilities: attribute binding, counting, spatial relations
```

## Benchmark Comparisons

| Model | FID↓ | CLIP↑ | IS↑ | Human Pref |
|-------|------|-------|-----|------------|
| SD 1.5 | 8.6 | 0.295 | 24 | Baseline |
| SDXL | 4.4 | 0.310 | 36 | +15% |
| DALL-E 3 | 3.8 | 0.327 | 41 | +28% |
| Midjourney v6 | N/A | N/A | N/A | Best overall |
| FLUX.1 | 4.1 | 0.321 | 39 | +24% |

## Compositional Evaluation

Modern benchmarks test compositional understanding:

```python
# T2I-CompBench tests specific compositional skills:
prompts = [
    "a red cube on top of a blue sphere",  # Spatial relations
    "three dogs and two cats",              # Counting
    "a tall woman wearing a short dress",  # Attribute binding
    "a cat to the left of a dog",          # Positional understanding
]

# Models often fail at:
# - Counting (>3 objects)
# - Attribute binding (red cube, blue ball — not red ball, blue cube)
# - Negation ("a dog without a leash")
```

## Key Takeaways

- IS measures quality + diversity via Inception classifier confidence and spread
- FID compares real vs. generated image distributions in feature space — most widely used
- CLIP score measures text-image alignment but not generation quality
- Human evaluation remains the gold standard; automated metrics have known blind spots
- State-of-the-art T2I models still struggle with counting, attribute binding, and spatial reasoning
