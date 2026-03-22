---
title: "Singleton and Factory Patterns"
description: "Control object creation with Singleton and Factory design patterns."
duration_minutes: 25
order: 1
---

## Singleton Pattern

Ensures only one instance of a class exists:

```python
class Singleton:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

class DatabaseConnection(Singleton):
    def __init__(self):
        if not hasattr(self, '_initialized'):
            self.connection = self._connect()
            self._initialized = True

    def _connect(self):
        print("Opening database connection")
        return "connection"

db1 = DatabaseConnection()
db2 = DatabaseConnection()
assert db1 is db2  # True
```

### Thread-Safe Singleton

```python
import threading

class ThreadSafeSingleton:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
```

### Module-Level Singleton

Python modules are singletons by default:

```python
# db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

_engine = create_engine("sqlite:///app.db")
SessionLocal = sessionmaker(bind=_engine)

# Any file that imports this gets the same objects
```

## Factory Pattern

Creates objects without specifying the exact class:

```python
from abc import ABC, abstractmethod

class Animal(ABC):
    @abstractmethod
    def speak(self) -> str: ...

class Dog(Animal):
    def speak(self) -> str:
        return "Woof!"

class Cat(Animal):
    def speak(self) -> str:
        return "Meow!"

class AnimalFactory:
    _registry: dict[str, type] = {}

    @classmethod
    def register(cls, name: str, animal_class: type):
        cls._registry[name] = animal_class

    @classmethod
    def create(cls, name: str) -> Animal:
        animal_class = cls._registry.get(name)
        if not animal_class:
            raise ValueError(f"Unknown animal: {name}")
        return animal_class()

AnimalFactory.register("dog", Dog)
AnimalFactory.register("cat", Cat)

animal = AnimalFactory.create("dog")
print(animal.speak())  # Woof!
```

### Abstract Factory

```python
from abc import ABC, abstractmethod

class Button(ABC):
    @abstractmethod
    def render(self) -> str: ...

class WindowsButton(Button):
    def render(self) -> str:
        return "<WindowsButton>"

class MacButton(Button):
    def render(self) -> str:
        return "<MacButton>"

class UIFactory(ABC):
    @abstractmethod
    def create_button(self) -> Button: ...

class WindowsFactory(UIFactory):
    def create_button(self) -> Button:
        return WindowsButton()

class MacFactory(UIFactory):
    def create_button(self) -> Button:
        return MacButton()

def render_ui(factory: UIFactory):
    button = factory.create_button()
    print(button.render())
```

## Key Takeaways

1. Singleton ensures a single instance across the application
2. Python modules are natural singletons
3. Factory decouples creation from usage
4. Use class registries for extensible factories
5. Abstract Factory creates families of related objects
