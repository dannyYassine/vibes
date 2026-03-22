from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.auth.models import User
from app.progress import service, schemas
from app.courses.content_loader import COURSE_TREE

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("", response_model=schemas.ProgressSummary)
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_summary(db, current_user.id)


@router.post("/{section}/{lesson}")
def toggle_lesson(
    section: str,
    lesson: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate section/lesson exists
    if section not in COURSE_TREE:
        raise HTTPException(status_code=404, detail="Section not found")
    lesson_slugs = [l["slug"] for l in COURSE_TREE[section].get("lessons", [])]
    if lesson not in lesson_slugs:
        raise HTTPException(status_code=404, detail="Lesson not found")

    lesson_id = f"{section}/{lesson}"
    completed = service.toggle_complete(db, current_user.id, lesson_id)
    return {"lesson_id": lesson_id, "completed": completed}
