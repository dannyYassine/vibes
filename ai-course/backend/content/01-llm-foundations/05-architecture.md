---
title: "Pre-Training: Architecture (Transformers, GPT, Llama)"
description: "Deep dive into the Transformer architecture powering modern LLMs"
duration_minutes: 22
order: 5
---

## The Transformer Architecture

The Transformer (Vaswani et al., "Attention Is All You Need", 2017) replaced recurrent networks with **self-attention**, enabling parallelism during training. Every modern LLM is a Transformer variant.

The original Transformer had an encoder-decoder structure for translation. Modern LLMs use only the **decoder** side in an autoregressive configuration.

## Core Components

### 1. Token + Positional Embeddings

Each token ID is mapped to a dense vector of size `d_model` (e.g., 4096 for Llama 3 8B).

```python
class TransformerEmbedding(nn.Module):
    def __init__(self, vocab_size, d_model, max_seq_len):
        super().__init__()
        self.token_embed = nn.Embedding(vocab_size, d_model)
        # Modern LLMs use RoPE instead of learned positional embeddings
        self.pos_embed = nn.Embedding(max_seq_len, d_model)

    def forward(self, token_ids):
        positions = torch.arange(token_ids.size(1))
        return self.token_embed(token_ids) + self.pos_embed(positions)
```

### 2. Self-Attention

The key operation in Transformers. Each token attends to all previous tokens (in decoder-only models with causal masking):

```python
def scaled_dot_product_attention(Q, K, V, mask=None):
    d_k = Q.size(-1)
    # Compute attention scores
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)

    # Apply causal mask (can't attend to future tokens)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, float('-inf'))

    # Softmax to get attention weights
    attn_weights = F.softmax(scores, dim=-1)

    # Weighted sum of values
    return torch.matmul(attn_weights, V)

class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        self.num_heads = num_heads
        self.d_head = d_model // num_heads

        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)

    def forward(self, x, mask=None):
        B, T, D = x.shape
        # Project to Q, K, V and split into heads
        Q = self.W_q(x).view(B, T, self.num_heads, self.d_head).transpose(1, 2)
        K = self.W_k(x).view(B, T, self.num_heads, self.d_head).transpose(1, 2)
        V = self.W_v(x).view(B, T, self.num_heads, self.d_head).transpose(1, 2)

        attn_out = scaled_dot_product_attention(Q, K, V, mask)
        attn_out = attn_out.transpose(1, 2).contiguous().view(B, T, D)
        return self.W_o(attn_out)
```

### 3. Feed-Forward Network (FFN)

After attention, each token is processed independently by a 2-layer MLP:

```python
class FeedForward(nn.Module):
    def __init__(self, d_model, d_ff):
        super().__init__()
        # SwiGLU activation (used by Llama)
        self.w1 = nn.Linear(d_model, d_ff, bias=False)
        self.w2 = nn.Linear(d_ff, d_model, bias=False)
        self.w3 = nn.Linear(d_model, d_ff, bias=False)

    def forward(self, x):
        # SwiGLU: swish(w1(x)) * w3(x), then project back
        return self.w2(F.silu(self.w1(x)) * self.w3(x))
```

### 4. Layer Normalization

Modern LLMs use **RMSNorm** (Root Mean Square Normalization) instead of LayerNorm for efficiency:

```python
class RMSNorm(nn.Module):
    def __init__(self, d_model, eps=1e-6):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(d_model))
        self.eps = eps

    def forward(self, x):
        rms = torch.sqrt(x.pow(2).mean(-1, keepdim=True) + self.eps)
        return x / rms * self.weight
```

## The GPT Architecture

GPT (Generative Pre-trained Transformer) is a decoder-only Transformer with:
- **Causal (left-to-right) attention**: Each token only attends to previous tokens
- **Learned positional embeddings** (GPT-1, GPT-2)
- **GELU activation** in FFN
- **Pre-normalization** (LayerNorm before attention/FFN, not after)

```
Input Tokens
    ↓ Token Embedding + Position Embedding
    ↓ Transformer Block ×N
      ↓ RMSNorm → Multi-Head Causal Attention → Residual
      ↓ RMSNorm → Feed-Forward → Residual
    ↓ Final RMSNorm
    ↓ Linear (d_model → vocab_size)
    ↓ Softmax → Next Token Probabilities
```

## The Llama Architecture

Meta's Llama series (1, 2, 3) made several architectural improvements over GPT:

### Rotary Position Embeddings (RoPE)

Instead of adding positional information to token embeddings, RoPE encodes position by rotating the Q and K vectors in attention:

```python
def apply_rope(x, freqs_cis):
    # x: (batch, seq_len, heads, head_dim)
    # freqs_cis: precomputed rotation matrices
    x_complex = torch.view_as_complex(x.float().reshape(*x.shape[:-1], -1, 2))
    x_rotated = x_complex * freqs_cis
    return torch.view_as_real(x_rotated).flatten(-2).type_as(x)
```

Benefits: Better generalization to longer sequences than learned position embeddings.

### Grouped-Query Attention (GQA)

Standard multi-head attention duplicates K and V heads for each Q head. GQA shares K/V heads across groups of Q heads, reducing memory:

```
MHA (32 heads): 32 Q heads, 32 K heads, 32 V heads
GQA (8 KV heads): 32 Q heads, 8 K heads, 8 V heads
MQA (1 KV head): 32 Q heads, 1 K head, 1 V head
```

Llama 3 70B uses 8 KV heads vs 64 Q heads — an 8× memory reduction for KV cache.

### SwiGLU Activation

Llama uses SwiGLU instead of ReLU in FFN, which empirically improves performance:

```
SwiGLU(x, W, V, W2) = (Swish(xW) ⊗ xV) · W2
where Swish(x) = x · σ(x)
```

## Architecture Comparison

| Feature | GPT-2 | GPT-3 | Llama 2 7B | Llama 3 8B |
|---------|-------|-------|-----------|-----------|
| Parameters | 1.5B | 175B | 7B | 8B |
| Layers | 48 | 96 | 32 | 32 |
| d_model | 1600 | 12288 | 4096 | 4096 |
| Attention heads | 25 | 96 | 32 | 32 |
| KV heads | 25 | 96 | 32 | 8 (GQA) |
| Context length | 1024 | 2048 | 4096 | 8192 |
| Norm type | LayerNorm | LayerNorm | RMSNorm | RMSNorm |
| Position | Learned | Learned | RoPE | RoPE |
| FFN activation | GELU | GELU | SwiGLU | SwiGLU |

## Scaling Laws

Chinchilla scaling laws (Hoffmann et al., 2022) show the optimal relationship between model size (N parameters) and training data (D tokens):

```
Optimal D ≈ 20 × N

Llama 2 7B: 7B params × 20 = 140B tokens recommended
            Meta trained on 2T tokens (over-trained for inference efficiency)
```

Over-training smaller models makes them more efficient at inference — a common production trade-off.

## Key Takeaways

- The Transformer decoder-only architecture is the foundation of all modern LLMs
- Key components: token embeddings, multi-head attention, feed-forward networks, normalization
- Llama improves on GPT with RoPE positions, GQA (fewer KV heads), RMSNorm, and SwiGLU
- Chinchilla scaling laws guide optimal compute allocation between model size and training tokens
- Architecture choices (GQA, RoPE) primarily affect inference efficiency and context length
