---
title: "Retrieval: Document Parsing and Chunking"
description: "Ingestion pipeline: parsing PDFs/HTML, chunking strategies, and metadata"
duration_minutes: 16
order: 5
---

## The Ingestion Pipeline

Before documents can be retrieved, they must be parsed, chunked, and indexed. The quality of this pipeline directly determines RAG quality — poor chunking leads to poor retrieval regardless of the embedding model.

```
Raw Documents → Parse → Clean → Chunk → Embed → Store
```

## Document Parsing

### PDF Parsing

```python
# Option 1: PyPDF2 (fast, basic)
import PyPDF2

def parse_pdf_basic(path: str) -> str:
    with open(path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        return "\n\n".join(page.extract_text() for page in reader.pages)

# Option 2: pdfminer (better layout handling)
from pdfminer.high_level import extract_text
text = extract_text("document.pdf")

# Option 3: pymupdf (best for complex layouts)
import fitz  # PyMuPDF

def parse_pdf_rich(path: str) -> list[dict]:
    doc = fitz.open(path)
    pages = []
    for i, page in enumerate(doc):
        pages.append({
            "content": page.get_text(),
            "page_number": i + 1,
            "metadata": {"source": path, "page": i + 1}
        })
    return pages
```

### HTML/Web Parsing

```python
from bs4 import BeautifulSoup
import requests

def parse_webpage(url: str) -> str:
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')

    # Remove noise
    for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
        tag.decompose()

    # Extract main content
    main = soup.find('main') or soup.find('article') or soup.body
    return main.get_text(separator='\n', strip=True)
```

## Chunking Strategies

### Fixed-Size Chunking

Split every N characters with overlap:

```python
def fixed_size_chunks(text: str, chunk_size=512, overlap=50) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap  # Overlap preserves context
    return chunks
```

**Pros**: Simple, predictable size
**Cons**: Splits mid-sentence, ignores structure

### Recursive Character Chunking

Split on semantic boundaries (paragraphs → sentences → words):

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " ", ""],  # Try in order
)
chunks = splitter.split_text(text)
```

This is the most widely-used chunking strategy.

### Semantic Chunking

Group sentences by semantic similarity:

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

splitter = SemanticChunker(
    OpenAIEmbeddings(),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=95,
)
chunks = splitter.create_documents([text])
```

**Pros**: Chunks contain semantically coherent content
**Cons**: Slower, variable sizes

### Markdown/Code-Aware Chunking

Preserve document structure:

```python
from langchain.text_splitter import MarkdownHeaderTextSplitter

headers_to_split_on = [
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
]
splitter = MarkdownHeaderTextSplitter(headers_to_split_on)
md_chunks = splitter.split_text(markdown_text)

# Each chunk includes header metadata
# [Document(page_content="...", metadata={"h1": "Section", "h2": "Subsection"})]
```

## Chunk Size Tradeoffs

| Chunk Size | Retrieval | Generation | Notes |
|-----------|-----------|-----------|-------|
| Very small (128 tokens) | Precise, noisy | Missing context | Good for fact lookup |
| Small (256 tokens) | Good precision | Adequate context | General purpose |
| Medium (512 tokens) | Balanced | Good context | Most common |
| Large (1024+ tokens) | Less precise | Rich context | Long-form documents |

**Rule of thumb**: Start at 512 tokens with 10% overlap. Adjust based on your evaluation.

## Metadata Extraction

Rich metadata enables filtered retrieval:

```python
def create_chunk_with_metadata(
    text: str,
    source: str,
    page: int = None,
    section: str = None,
    date: str = None,
) -> dict:
    return {
        "content": text,
        "metadata": {
            "source": source,
            "page": page,
            "section": section,
            "date": date,
            "char_count": len(text),
            "word_count": len(text.split()),
        }
    }

# Use metadata for filtered retrieval
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=5,
    where={"date": {"$gte": "2024-01-01"}},  # Only recent docs
)
```

## Key Takeaways

- Document parsing quality determines the ceiling of RAG performance
- Recursive character splitting is the most practical general-purpose strategy
- Semantic chunking produces higher quality but at higher cost
- 512 tokens with 10% overlap is a good starting point for chunk size
- Include rich metadata (source, date, section) to enable filtered retrieval
