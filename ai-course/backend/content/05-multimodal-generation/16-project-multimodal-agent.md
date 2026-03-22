---
title: "Project: Build a Multi-modal Agent"
description: "Build an agent that understands images, generates images, and answers questions about visual content"
duration_minutes: 35
order: 16
---

## What You'll Build

A **multi-modal agent** that can:
1. Accept image uploads and answer questions about them (visual QA)
2. Generate images from text descriptions via API
3. Analyze, compare, and reason about multiple images
4. Produce structured reports combining text and visual analysis

## Architecture Overview

```
User (text + optional images)
    ↓
[Multi-modal LLM] ← vision input via base64
    ↓ [decides which tools to call]
    ├── analyze_image(image) → description
    ├── generate_image(prompt) → image URL
    ├── compare_images(img1, img2) → differences
    └── search_similar_images(description) → results
    ↓
Response with text + images
```

## Step 1: Tool Definitions

```python
import anthropic
import base64
import httpx
import json
from pathlib import Path

client = anthropic.Anthropic()

# Tool definitions for the model
TOOLS = [
    {
        "name": "analyze_image",
        "description": "Analyze an image and provide a detailed description of its contents, style, mood, and any text present.",
        "input_schema": {
            "type": "object",
            "properties": {
                "image_path": {
                    "type": "string",
                    "description": "Path or URL to the image to analyze"
                },
                "focus": {
                    "type": "string",
                    "enum": ["general", "objects", "text", "style", "emotions"],
                    "description": "What aspect to focus on"
                }
            },
            "required": ["image_path"]
        }
    },
    {
        "name": "generate_image",
        "description": "Generate an image from a text description using a text-to-image API.",
        "input_schema": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Detailed text description of the image to generate"
                },
                "style": {
                    "type": "string",
                    "enum": ["photorealistic", "illustration", "painting", "sketch"],
                    "default": "photorealistic"
                },
                "aspect_ratio": {
                    "type": "string",
                    "enum": ["1:1", "16:9", "9:16", "4:3"],
                    "default": "1:1"
                }
            },
            "required": ["prompt"]
        }
    },
    {
        "name": "compare_images",
        "description": "Compare two images and identify similarities and differences.",
        "input_schema": {
            "type": "object",
            "properties": {
                "image_path_1": {"type": "string"},
                "image_path_2": {"type": "string"},
                "comparison_type": {
                    "type": "string",
                    "enum": ["visual_similarity", "content_difference", "style_comparison"],
                    "default": "content_difference"
                }
            },
            "required": ["image_path_1", "image_path_2"]
        }
    }
]
```

## Step 2: Tool Implementations

```python
def load_image_as_base64(image_path: str) -> tuple[str, str]:
    """Load an image file and return (base64_data, media_type)."""
    path = Path(image_path)
    suffix = path.suffix.lower()
    media_types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                   ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}
    media_type = media_types.get(suffix, "image/jpeg")

    with open(path, "rb") as f:
        data = base64.standard_b64encode(f.read()).decode()
    return data, media_type


def analyze_image(image_path: str, focus: str = "general") -> str:
    """Use Claude's vision to analyze an image."""
    img_data, media_type = load_image_as_base64(image_path)

    focus_prompts = {
        "general": "Provide a comprehensive description including subjects, setting, colors, mood, and any text.",
        "objects": "List and describe all objects visible in the image.",
        "text": "Extract and transcribe all text visible in the image.",
        "style": "Analyze the visual style: art style, photography technique, color palette, composition.",
        "emotions": "Describe the emotions, mood, and atmosphere conveyed by the image.",
    }

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {
                    "type": "base64", "media_type": media_type, "data": img_data
                }},
                {"type": "text", "text": focus_prompts.get(focus, focus_prompts["general"])}
            ]
        }]
    )
    return response.content[0].text


def generate_image(prompt: str, style: str = "photorealistic", aspect_ratio: str = "1:1") -> str:
    """Generate an image using a T2I API (e.g., Stability AI, DALL-E, Replicate)."""
    # Using Stability AI as example
    # Replace with your preferred T2I API
    style_presets = {
        "photorealistic": "photographic",
        "illustration": "digital-art",
        "painting": "oil-painting",
        "sketch": "sketch",
    }

    dimensions = {
        "1:1": (1024, 1024),
        "16:9": (1344, 768),
        "9:16": (768, 1344),
        "4:3": (1152, 896),
    }
    width, height = dimensions.get(aspect_ratio, (1024, 1024))

    # Example with Stability AI API
    response = httpx.post(
        "https://api.stability.ai/v2beta/stable-image/generate/core",
        headers={"Authorization": f"Bearer {STABILITY_API_KEY}"},
        data={
            "prompt": prompt,
            "style_preset": style_presets.get(style, "photographic"),
            "output_format": "png",
            "aspect_ratio": aspect_ratio,
        },
        timeout=30,
    )

    # Save generated image and return path
    output_path = f"/tmp/generated_{hash(prompt)}.png"
    with open(output_path, "wb") as f:
        f.write(response.content)

    return output_path


def compare_images(image_path_1: str, image_path_2: str, comparison_type: str = "content_difference") -> str:
    """Compare two images using Claude's vision."""
    img1_data, media_type1 = load_image_as_base64(image_path_1)
    img2_data, media_type2 = load_image_as_base64(image_path_2)

    prompts = {
        "visual_similarity": "How similar are these two images? Rate similarity 0-100 and explain.",
        "content_difference": "What are the key differences in content between these two images?",
        "style_comparison": "Compare the visual style, composition, and aesthetic of these two images.",
    }

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=400,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type1, "data": img1_data}},
                {"type": "image", "source": {"type": "base64", "media_type": media_type2, "data": img2_data}},
                {"type": "text", "text": prompts.get(comparison_type, prompts["content_difference"])}
            ]
        }]
    )
    return response.content[0].text
```

## Step 3: The Agentic Loop

```python
def process_tool_call(tool_name: str, tool_input: dict) -> str:
    """Execute a tool and return the result."""
    if tool_name == "analyze_image":
        return analyze_image(
            tool_input["image_path"],
            tool_input.get("focus", "general")
        )
    elif tool_name == "generate_image":
        path = generate_image(
            tool_input["prompt"],
            tool_input.get("style", "photorealistic"),
            tool_input.get("aspect_ratio", "1:1")
        )
        return json.dumps({"generated_image_path": path, "status": "success"})
    elif tool_name == "compare_images":
        return compare_images(
            tool_input["image_path_1"],
            tool_input["image_path_2"],
            tool_input.get("comparison_type", "content_difference")
        )
    else:
        return f"Unknown tool: {tool_name}"


def multimodal_agent(
    user_message: str,
    uploaded_images: list[str] = None,
    max_turns: int = 5,
) -> str:
    """Run the multi-modal agent loop."""
    # Build initial message with any uploaded images
    content = []
    if uploaded_images:
        for img_path in uploaded_images:
            img_data, media_type = load_image_as_base64(img_path)
            content.append({"type": "image", "source": {
                "type": "base64", "media_type": media_type, "data": img_data
            }})
    content.append({"type": "text", "text": user_message})

    messages = [{"role": "user", "content": content}]

    for turn in range(max_turns):
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2048,
            tools=TOOLS,
            messages=messages,
        )

        # Check if we're done
        if response.stop_reason == "end_turn":
            return response.content[0].text

        # Process tool calls
        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []

            for block in response.content:
                if block.type == "tool_use":
                    print(f"Calling tool: {block.name}({block.input})")
                    result = process_tool_call(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })

            messages.append({"role": "user", "content": tool_results})

    return "Max turns reached without completing the task."
```

## Step 4: Example Usage

```python
# Example 1: Analyze an uploaded image
result = multimodal_agent(
    "What's in this image? Does it look professional enough for a blog post?",
    uploaded_images=["./my_photo.jpg"]
)

# Example 2: Generate and analyze
result = multimodal_agent(
    "Generate a logo for a tech startup called 'Pixel AI' and describe what you created."
)

# Example 3: Compare two design options
result = multimodal_agent(
    "Compare these two website mockups and tell me which has better visual hierarchy.",
    uploaded_images=["./mockup_a.png", "./mockup_b.png"]
)

print(result)
```

## What You've Applied

| Concept | Where Used |
|---------|-----------|
| Tool calling | Image analysis, generation, comparison tools |
| Multi-step agents | Agentic loop with tool results |
| Multi-modal LLM | Claude's vision for image understanding |
| T2I integration | Stability AI / DALL-E for generation |
| VAE understanding | Behind every T2I API call |

## Key Takeaways

- Multi-modal agents combine vision understanding with tool-use planning
- Claude's vision API accepts base64-encoded images directly in message content
- Tool calling makes the agent extensible: add OCR, object detection, video analysis
- The same agentic loop pattern works for any combination of modalities
- Real-world applications: content moderation, product photography, design review
