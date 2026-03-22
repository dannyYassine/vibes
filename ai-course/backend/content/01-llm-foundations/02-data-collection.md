---
title: "Pre-Training: Data Collection"
description: "How LLMs are trained on internet-scale text — sources, pipelines, and challenges"
duration_minutes: 18
order: 2
---

## Why Data is the Foundation

Training a frontier LLM requires more than a powerful model architecture — it requires high-quality data at scale. The training corpus determines what a model knows, what biases it carries, what languages it speaks, and what tasks it can generalize to.

A rough rule of thumb: modern LLMs train on **1–15 trillion tokens**. To put that in perspective, the English Wikipedia contains ~4 billion tokens. The training corpus is typically 2,500 to 3,750× larger than Wikipedia.

## Sources of Pre-Training Data

### Web Crawls

The internet is the most abundant source of text. The **Common Crawl** project has been crawling the web since 2008 and makes its data freely available.

- ~3 petabytes of raw data per month
- Contains HTML, WARC records, and plain text extracts
- Covers hundreds of languages
- Quality varies enormously — from academic papers to spam

Most LLM training sets start with Common Crawl as the foundation, then apply aggressive filtering.

### Curated High-Quality Sources

To improve signal-to-noise ratio, training pipelines include hand-curated datasets:

| Source | Content Type | Approximate Size |
|--------|-------------|-----------------|
| Wikipedia | Encyclopedia articles | ~4B tokens |
| Books3/Pile of Law | Books and legal text | ~100B tokens |
| GitHub | Code (50+ languages) | ~200B tokens |
| ArXiv | Scientific papers | ~30B tokens |
| StackExchange | Q&A technical content | ~15B tokens |
| PubMed | Biomedical literature | ~25B tokens |

### Code Data

Code is particularly valuable for reasoning capabilities. LLMs trained on code show improved logical reasoning, instruction following, and structured output generation — even for non-coding tasks.

```python
# Example: GitHub data after processing
{
    "repo": "pytorch/pytorch",
    "path": "torch/nn/modules/linear.py",
    "content": "class Linear(Module):\n    ...",
    "language": "Python",
    "stars": 75000,
    "license": "BSD-3-Clause"
}
```

## The Data Pipeline

Raw web data requires a multi-stage processing pipeline before it's suitable for training:

```
Common Crawl → URL Filtering → Language Detection
    → Quality Filtering → Deduplication
    → Safety Filtering → Tokenization
    → Training Shards
```

### Stage 1: URL Filtering

Block entire domains known to contain low-quality content:
- Adult content sites
- Spam/SEO farms
- Known malware domains

Allowlist high-quality domains that should always be included.

### Stage 2: Language Detection

Most LLMs target primarily English content, so non-English content is either filtered or sampled at lower rates. Tools like `fastText` or `langdetect` classify each document's language.

### Stage 3: Quality Filtering

This is the most important and complex step. Heuristics include:

```python
def quality_filter(document):
    # Length filters
    if len(document.split()) < 50:
        return False

    # Repetition detection
    lines = document.split('\n')
    if len(set(lines)) / len(lines) < 0.8:
        return False

    # Symbol ratio (spam indicator)
    alpha_chars = sum(c.isalpha() for c in document)
    if alpha_chars / len(document) < 0.7:
        return False

    # Perplexity filter (trained classifier)
    if high_perplexity_classifier(document):
        return False

    return True
```

The **C4 dataset** (used by T5) popularized many of these heuristics. Later work (like the **RefinedWeb** paper) showed that aggressive quality filtering of Common Crawl alone can produce training data competitive with curated mixtures.

### Stage 4: Deduplication

Exact and near-duplicate documents are harmful for training — they:
- Waste compute on redundant examples
- Cause memorization of specific texts
- Inflate perceived dataset diversity

**MinHash LSH** is the standard approach for near-duplicate detection at scale:

```python
from datasketch import MinHash, MinHashLSH

def compute_minhash(text, num_perm=128):
    m = MinHash(num_perm=num_perm)
    for shingle in get_shingles(text, k=5):
        m.update(shingle.encode('utf8'))
    return m

# Build LSH index and find near-duplicates
lsh = MinHashLSH(threshold=0.8, num_perm=128)
```

The Llama 2 training data report noted that deduplication removed ~30% of documents while improving model quality.

## Data Mixture and Weighting

Different data sources contribute different characteristics. The final training corpus is a weighted mixture:

```python
# Approximate mixture for a modern LLM
data_mixture = {
    "web_filtered": 0.45,    # High-quality filtered web
    "code": 0.20,            # GitHub, StackOverflow
    "books": 0.15,           # Books, long-form text
    "wikipedia": 0.05,       # Factual knowledge
    "academic": 0.10,        # Papers, technical docs
    "other": 0.05,           # Misc curated sources
}
```

**Upsampling** high-quality sources (books, Wikipedia) increases their effective representation. **Downsampling** noisier web data reduces their influence.

Recent research (e.g., **DoReMi**, **Data Selection for LLMs**) shows that data mixture ratios significantly affect downstream performance and optimal ratios can be found algorithmically.

## Key Challenges

1. **Legal and copyright**: Web-scraped data may contain copyrighted material. LLM training is an active area of litigation.

2. **Personal information**: Training data may contain PII (names, emails, phone numbers) which models can memorize.

3. **Bias and toxicity**: Web text reflects societal biases. Models trained on it may reproduce or amplify them.

4. **Data contamination**: Test set questions may appear in training data, inflating benchmark scores. Careful decontamination is needed.

## Key Takeaways

- LLMs require trillion-token datasets; Common Crawl is the primary raw source
- Data quality matters more than raw quantity; aggressive filtering beats naive scaling
- Deduplication is critical for preventing memorization and improving generalization
- Code data improves general reasoning capabilities, not just coding
- Data mixture ratios meaningfully affect final model capabilities
