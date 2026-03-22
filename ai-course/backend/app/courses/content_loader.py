import json
import os
from pathlib import Path
from typing import Any

import frontmatter

from app.config import settings

# Global cache loaded at startup
COURSE_TREE: dict[str, Any] = {}


def load_content():
    """Scan content directory, parse frontmatter, build COURSE_TREE."""
    content_dir = Path(settings.CONTENT_DIR)
    if not content_dir.exists():
        return

    section_dirs = sorted(
        [d for d in content_dir.iterdir() if d.is_dir()],
        key=lambda d: d.name,
    )

    for section_dir in section_dirs:
        section_slug = section_dir.name
        meta_file = section_dir / "_section.json"

        section_meta = {"title": section_slug, "description": "", "order": 0}
        if meta_file.exists():
            with open(meta_file) as f:
                section_meta.update(json.load(f))

        lessons = []
        md_files = sorted(
            [f for f in section_dir.glob("*.md")],
            key=lambda f: f.name,
        )
        for md_file in md_files:
            post = frontmatter.load(str(md_file))
            lesson_slug = md_file.stem
            lessons.append(
                {
                    "slug": lesson_slug,
                    "title": post.metadata.get("title", lesson_slug),
                    "description": post.metadata.get("description", ""),
                    "duration_minutes": post.metadata.get("duration_minutes", 0),
                    "order": post.metadata.get("order", 0),
                    "raw_markdown": post.content,
                }
            )

        COURSE_TREE[section_slug] = {
            **section_meta,
            "slug": section_slug,
            "lessons": lessons,
        }
