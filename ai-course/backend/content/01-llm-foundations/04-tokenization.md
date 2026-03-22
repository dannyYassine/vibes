---
title: "Pre-Training: Tokenization (BPE)"
description: "How text is converted into tokens using Byte-Pair Encoding and the vocabulary design choices"
duration_minutes: 14
order: 4
---

## What is Tokenization?

LLMs don't process raw characters — they process **tokens**. A token is the atomic unit of text the model sees. Most tokens correspond to common words or word pieces:

```
"Hello, world!" → ["Hello", ",", " world", "!"]
"tokenization"  → ["token", "ization"]
"unbelievable"  → ["un", "bel", "iev", "able"]
```

The tokenizer converts text to a sequence of integer IDs before it enters the model, and converts IDs back to text when generating.

## Why Not Characters or Words?

**Character-level**: Simple but creates very long sequences. "Hello world" = 11 tokens. LLMs are quadratic in sequence length (attention), so this is expensive.

**Word-level**: Short sequences but huge vocabularies (500K+ English words), can't handle misspellings, new words, or other languages.

**Subword tokenization** (BPE, WordPiece, SentencePiece) finds the sweet spot: manageable vocabulary size (32K–100K) with reasonable sequence lengths.

## Byte-Pair Encoding (BPE)

BPE was originally a text compression algorithm, adapted for NLP by Sennrich et al. (2016) and used by GPT-2/3/4, Llama, and most modern LLMs.

### Training Algorithm

```python
def train_bpe(corpus, vocab_size):
    # Start: vocabulary is all individual bytes (256 tokens)
    vocab = {bytes([i]): i for i in range(256)}
    merges = []

    # Tokenize corpus at byte level
    tokens = [[c.encode() for c in word] for word in corpus]

    while len(vocab) < vocab_size:
        # Count all adjacent pairs
        pair_counts = Counter()
        for token_seq in tokens:
            for pair in zip(token_seq, token_seq[1:]):
                pair_counts[pair] += 1

        if not pair_counts:
            break

        # Find most frequent pair
        best_pair = max(pair_counts, key=pair_counts.get)
        new_token = best_pair[0] + best_pair[1]

        # Add to vocabulary
        vocab[new_token] = len(vocab)
        merges.append(best_pair)

        # Apply merge to all token sequences
        tokens = [merge_pair(seq, best_pair, new_token) for seq in tokens]

    return vocab, merges
```

### Example: BPE in Action

Starting with the corpus: `["low", "lower", "newest", "widest"]`

```
Initial tokens:   l o w | l o w e r | n e w e s t | w i d e s t
Count pairs:      (e, s): 2, (s, t): 2, (l, o): 2, (o, w): 2...

Merge (e, s) → es:  l o w | l o w e r | n e w es t | w i d es t
Merge (es, t) → est: l o w | l o w e r | n e w est | w i d est
...continues until vocab_size reached
```

## Modern Tokenizers

### tiktoken (OpenAI)

Used by GPT-3.5, GPT-4, and many others. Implements BPE on bytes (not Unicode code points), so it handles all languages and emojis naturally.

```python
import tiktoken

enc = tiktoken.encoding_for_model("gpt-4")

text = "Hello, world! 🌍"
tokens = enc.encode(text)
print(tokens)        # [9906, 11, 1917, 0, 11410, 236, 127]
print(len(tokens))   # 7

decoded = enc.decode(tokens)
print(decoded)       # "Hello, world! 🌍"
```

### SentencePiece (Google)

Used by T5, Gemma, and many multilingual models. Treats the input as a raw byte stream, enabling language-agnostic tokenization.

```python
import sentencepiece as spm

# Train
spm.SentencePieceTrainer.train(
    input='corpus.txt',
    model_prefix='tokenizer',
    vocab_size=32000,
    model_type='bpe'
)

# Use
sp = spm.SentencePieceProcessor()
sp.load('tokenizer.model')

tokens = sp.encode("Hello world", out_type=str)
# ['▁Hello', '▁world']
```

Note the `▁` (underscore) prefix indicating space before token.

## Vocabulary Size Trade-offs

| Vocab Size | Pros | Cons | Example Models |
|-----------|------|------|----------------|
| ~32K | Short vocabularies, faster softmax | Longer sequences, less English coverage | T5, early Llama |
| ~50K | Balanced | — | GPT-2, GPT-3 |
| ~100K | Excellent coverage, shorter sequences | Larger embedding tables | GPT-4, Llama 3 |
| ~150K+ | Maximum efficiency | Large model size overhead | Llama 3 (128K) |

## Tokenization Quirks and Gotchas

### Numbers are tokenized inconsistently

```python
enc.encode("1234567890")
# [4513, 22191, 21910]  (3 tokens — not 10!)

enc.encode("1 2 3 4 5 6 7 8 9 0")
# [16, 220, 17, 220, 18, ...]  (much longer)
```

This is why LLMs struggle with arithmetic — "123 + 456" doesn't have a natural token-level structure.

### Whitespace matters

```python
enc.encode("Hello")   # [9906]
enc.encode(" Hello")  # [22691]  ← Different token!
```

### Non-English is token-inefficient

English text typically tokenizes at ~3-4 characters/token. Chinese, Arabic, and other scripts may need 1-2 characters/token, making prompts effectively 2-4× longer.

## Tokenization and Model Performance

Tokenization choices have downstream effects:

1. **Context efficiency**: A 128K context window tokenizing Chinese at 1.5 chars/token is effectively a 50K-character window — half of GPT-4's English equivalent.

2. **Arithmetic**: Numbers that don't align with token boundaries are harder for models to reason about.

3. **Code**: Code tokenizers should treat common patterns (`:=`, `->`, `def `) as single tokens.

## Key Takeaways

- BPE builds a vocabulary by iteratively merging the most frequent adjacent byte pairs
- Modern tokenizers use 32K-128K vocabulary sizes as a balance between sequence length and coverage
- tiktoken (OpenAI) and SentencePiece (Google) are the two dominant tokenizer implementations
- Token boundaries don't align with character or word boundaries — this causes quirks with numbers and non-English text
- The tokenizer is trained once and frozen; changing it requires retraining the entire model
