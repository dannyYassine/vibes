from typing import Dict, List
from pydantic import BaseModel


class SectionProgress(BaseModel):
    total: int
    completed: int
    percentage: float


class ProgressSummary(BaseModel):
    completed_lessons: List[str]
    sections: Dict[str, SectionProgress]
