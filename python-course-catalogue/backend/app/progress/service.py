from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.progress.models import UserProgress
from app.courses.content_loader import COURSE_TREE


def get_completed_lessons(db: Session, user_id: int) -> list[str]:
    rows = db.query(UserProgress.lesson_id).filter(UserProgress.user_id == user_id).all()
    return [r.lesson_id for r in rows]


def toggle_complete(db: Session, user_id: int, lesson_id: str) -> bool:
    """Toggle lesson completion. Returns True if now complete, False if now incomplete."""
    existing = (
        db.query(UserProgress)
        .filter(UserProgress.user_id == user_id, UserProgress.lesson_id == lesson_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return False
    else:
        record = UserProgress(user_id=user_id, lesson_id=lesson_id)
        db.add(record)
        db.commit()
        return True


def get_summary(db: Session, user_id: int) -> dict:
    completed = set(get_completed_lessons(db, user_id))
    sections = {}

    for section_slug, section_data in COURSE_TREE.items():
        lessons = section_data.get("lessons", [])
        total = len(lessons)
        done = sum(
            1 for lesson in lessons if f"{section_slug}/{lesson['slug']}" in completed
        )
        sections[section_slug] = {
            "total": total,
            "completed": done,
            "percentage": round((done / total * 100) if total > 0 else 0, 1),
        }

    return {
        "completed_lessons": list(completed),
        "sections": sections,
    }
