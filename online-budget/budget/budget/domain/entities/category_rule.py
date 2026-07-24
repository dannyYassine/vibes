from dataclasses import dataclass


@dataclass
class CategoryRule:
    id: int | None = None
    match_key: str = ""
    category_id: int = 0
    times_confirmed: int = 0

    @classmethod
    def fromDatabase(cls, row) -> "CategoryRule":
        return cls(
            id=row.id,
            match_key=row.match_key,
            category_id=row.category_id,
            times_confirmed=row.times_confirmed,
        )