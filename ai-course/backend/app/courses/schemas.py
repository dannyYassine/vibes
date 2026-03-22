from typing import List, Optional
from pydantic import BaseModel


class LessonOut(BaseModel):
    slug: str
    title: str
    description: str
    duration_minutes: int
    order: int


class SectionOut(BaseModel):
    slug: str
    title: str
    description: str
    order: int
    lessons: List[LessonOut]


class LessonDetail(BaseModel):
    slug: str
    title: str
    description: str
    duration_minutes: int
    order: int
    raw_markdown: str
    section_slug: str
    prev_lesson: Optional[str] = None
    next_lesson: Optional[str] = None
