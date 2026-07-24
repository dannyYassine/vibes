from dataclasses import dataclass


@dataclass
class Category:
    id: int | None = None
    name: str = ""
    color: str = "#999999"

    @classmethod
    def fromDatabase(cls, row) -> "Category":
        return cls(id=row.id, name=row.name, color=row.color)