from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.dependencies import get_current_user
from app.auth.models import User
from app.courses.content_loader import COURSE_TREE
from app.courses.schemas import SectionOut, LessonDetail

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("", response_model=List[SectionOut])
def list_courses(current_user: User = Depends(get_current_user)):
    result = []
    for section_slug, section_data in COURSE_TREE.items():
        lessons = [
            {
                "slug": l["slug"],
                "title": l["title"],
                "description": l["description"],
                "duration_minutes": l["duration_minutes"],
                "order": l["order"],
            }
            for l in section_data.get("lessons", [])
        ]
        result.append(
            {
                "slug": section_slug,
                "title": section_data["title"],
                "description": section_data.get("description", ""),
                "order": section_data.get("order", 0),
                "lessons": lessons,
            }
        )
    return result


@router.get("/{section}/{lesson}", response_model=LessonDetail)
def get_lesson(
    section: str,
    lesson: str,
    current_user: User = Depends(get_current_user),
):
    if section not in COURSE_TREE:
        raise HTTPException(status_code=404, detail="Section not found")

    section_data = COURSE_TREE[section]
    lessons = section_data.get("lessons", [])
    lesson_index = next((i for i, l in enumerate(lessons) if l["slug"] == lesson), None)

    if lesson_index is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    lesson_data = lessons[lesson_index]
    prev_lesson = lessons[lesson_index - 1]["slug"] if lesson_index > 0 else None
    next_lesson = lessons[lesson_index + 1]["slug"] if lesson_index < len(lessons) - 1 else None

    return {
        **lesson_data,
        "section_slug": section,
        "prev_lesson": prev_lesson,
        "next_lesson": next_lesson,
    }
