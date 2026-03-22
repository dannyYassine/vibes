---
title: "Pre-Training: Data Cleaning"
description: "Techniques for filtering, deduplicating, and preparing web-scale text for LLM training"
duration_minutes: 16
order: 3
---

## Why Cleaning Matters

"Garbage in, garbage out" applies with extreme force to LLM training. A frontier model trained on 10 trillion tokens has no way to ignore noise — it learns from everything, including spam, toxic content, and low-quality text.

The goal of data cleaning is to maximize the **signal-to-noise ratio** of training data while preserving diversity and scale. Over-filtering removes too much data; under-filtering degrades model quality. Finding the right balance is both art and science.

## The Cleaning Pipeline

A typical data cleaning pipeline has these stages:

```
Raw Documents
    ↓ Language Detection
    ↓ Heuristic Filtering
    ↓ Model-Based Quality Scoring
    ↓ Deduplication (Exact + Near-Exact)
    ↓ Safety Filtering
    ↓ Final Cleaned Corpus
```

## Stage 1: Language Detection

Most production LLMs target primarily English (or a set of supported languages). Language detection uses fast classifiers:

```python
import fasttext

# FastText language identification model
lid_model = fasttext.load_model('lid.176.bin')

def detect_language(text):
    # Returns (label, confidence)
    label, prob = lid_model.predict(text[:1000])
    lang = label[0].replace('__label__', '')
    return lang, prob[0]

# Keep only high-confidence English
def keep_document(text, threshold=0.65):
    lang, conf = detect_language(text)
    return lang == 'en' and conf >= threshold
```

## Stage 2: Heuristic Filtering

Heuristic rules are cheap to compute and catch obvious low-quality content.

### Length-Based Filters

```python
def length_filters(text):
    words = text.split()
    lines = text.split('\n')

    # Too short to be useful
    if len(words) < 50:
        return False

    # Very short average line length = bulleted spam
    avg_line_len = len(words) / max(len(lines), 1)
    if avg_line_len < 3:
        return False

    return True
```

### Symbol and Character Filters

```python
def symbol_filters(text):
    # Excessive punctuation = spam/SEO
    punct_ratio = sum(c in '!?...' for c in text) / len(text)
    if punct_ratio > 0.1:
        return False

    # Low alphabetic ratio = code dumps or noise
    alpha_ratio = sum(c.isalpha() for c in text) / len(text)
    if alpha_ratio < 0.6:
        return False

    # Excessive uppercase = SHOUTING SPAM
    upper_ratio = sum(c.isupper() for c in text) / max(sum(c.isalpha() for c in text), 1)
    if upper_ratio > 0.3:
        return False

    return True
```

### Repetition Filters

Repetitive text (e.g., copy-pasted content, template spam) is easy to detect:

```python
def repetition_filter(text):
    # Line-level repetition
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if len(lines) > 0:
        unique_ratio = len(set(lines)) / len(lines)
        if unique_ratio < 0.7:
            return False

    # N-gram repetition
    words = text.lower().split()
    trigrams = [' '.join(words[i:i+3]) for i in range(len(words)-2)]
    if trigrams:
        unique_tri_ratio = len(set(trigrams)) / len(trigrams)
        if unique_tri_ratio < 0.5:
            return False

    return True
```

## Stage 3: Model-Based Quality Scoring

**Classifier-based filtering** uses a model trained on high-quality vs. low-quality text pairs.

The **CCNet** approach (used by Llama) trains a fastText classifier on Wikipedia (positive) vs. random Common Crawl (negative), then keeps only high-scoring documents:

```python
# Train quality classifier
positive_data = load_wikipedia()   # High quality
negative_data = load_common_crawl_sample()  # Mixed quality

# FastText binary classifier
classifier = train_fasttext_classifier(
    positive_data, negative_data,
    n_epochs=5, lr=0.1
)

def quality_score(text):
    _, probs = classifier.predict(text)
    return probs[0]  # P(high quality)

# Keep top 30% by quality score
threshold = np.percentile(scores, 70)
filtered = [doc for doc, score in zip(docs, scores) if score >= threshold]
```

## Stage 4: Deduplication

Deduplication is critical and often removes 20-40% of "unique" documents that are actually near-duplicates.

### Exact Deduplication

```python
import hashlib

def exact_dedup(documents):
    seen = set()
    unique = []
    for doc in documents:
        # Normalize before hashing
        normalized = ' '.join(doc.lower().split())
        doc_hash = hashlib.md5(normalized.encode()).hexdigest()
        if doc_hash not in seen:
            seen.add(doc_hash)
            unique.append(doc)
    return unique
```

### Near-Duplicate Detection with MinHash

Exact hashing misses documents that are 90% identical with minor changes. MinHash LSH catches these:

```python
from datasketch import MinHash, MinHashLSH

def shinglize(text, k=5):
    """Convert text to set of character k-grams."""
    text = text.lower()
    return {text[i:i+k] for i in range(len(text) - k + 1)}

def build_minhash(text, num_perm=128):
    m = MinHash(num_perm=num_perm)
    for shingle in shinglize(text):
        m.update(shingle.encode('utf8'))
    return m

# Find near-duplicates (Jaccard similarity > 0.8)
lsh = MinHashLSH(threshold=0.8, num_perm=128)

for i, doc in enumerate(documents):
    m = build_minhash(doc)
    duplicates = lsh.query(m)
    if not duplicates:
        lsh.insert(f"doc_{i}", m)
```

## Stage 5: Safety Filtering

Remove documents containing:
- **CSAM** (mandatory, using hashing-based detection)
- **Extreme toxicity** (trained classifiers like Perspective API)
- **Personally Identifiable Information** (PII scrubbing)

```python
from presidio_analyzer import AnalyzerEngine

analyzer = AnalyzerEngine()

def scrub_pii(text):
    results = analyzer.analyze(text=text, language='en')
    # Replace detected PII with placeholders
    for result in sorted(results, key=lambda x: x.start, reverse=True):
        placeholder = f"[{result.entity_type}]"
        text = text[:result.start] + placeholder + text[result.end:]
    return text
```

## Data Cards and Documentation

Modern responsible AI practice requires **data documentation** — describing what data was collected, how it was processed, and what limitations remain. Data cards include:

- Data sources and collection methodology
- Filtering criteria and removal rates
- Known biases and limitations
- Privacy considerations

## Key Takeaways

- Data cleaning is multi-stage: language detection → heuristics → quality scoring → deduplication → safety
- Heuristic filters catch obvious noise cheaply; model-based scoring identifies subtler quality issues
- Deduplication removes 20-40% of data but significantly improves model quality
- Safety filtering is non-negotiable but requires care not to over-filter
- Document your data pipeline — data cards are becoming an industry standard
