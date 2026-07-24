from abc import ABC, abstractmethod
from datetime import date


class RBCScraper(ABC):
    @abstractmethod
    def scrape(self, since: date) -> list[dict]: ...