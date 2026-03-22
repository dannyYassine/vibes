---
title: "Object-Oriented Programming Basics"
description: "Understand classes, objects, inheritance, and encapsulation in Python."
duration_minutes: 35
order: 4
---

## Classes and Objects

A class is a blueprint; an object is an instance of that blueprint.

```python
class Dog:
    # Class attribute (shared by all instances)
    species = "Canis familiaris"

    # Constructor (initializer)
    def __init__(self, name, age):
        # Instance attributes
        self.name = name
        self.age = age

    # Instance method
    def bark(self):
        return f"{self.name} says woof!"

    def description(self):
        return f"{self.name} is {self.age} years old"

# Creating objects
buddy = Dog("Buddy", 5)
max = Dog("Max", 3)

print(buddy.bark())        # Buddy says woof!
print(max.description())   # Max is 3 years old
print(Dog.species)         # Canis familiaris
```

## The `self` Parameter

`self` refers to the instance calling the method:

```python
class Counter:
    def __init__(self):
        self.count = 0

    def increment(self):
        self.count += 1
        return self  # Enable method chaining

    def reset(self):
        self.count = 0
        return self

# Method chaining
counter = Counter()
counter.increment().increment().increment()
print(counter.count)  # 3
```

## Inheritance

Classes can inherit from parent classes:

```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        raise NotImplementedError("Subclass must implement")

class Dog(Animal):
    def speak(self):
        return f"{self.name} barks"

class Cat(Animal):
    def speak(self):
        return f"{self.name} meows"

# Using inheritance
dog = Dog("Buddy")
cat = Cat("Whiskers")
print(dog.speak())  # Buddy barks
print(cat.speak())  # Whiskers meows
```

### Calling Parent Methods

```python
class Animal:
    def __init__(self, name, age):
        self.name = name
        self.age = age

class Dog(Animal):
    def __init__(self, name, age, breed):
        super().__init__(name, age)  # Call parent constructor
        self.breed = breed

dog = Dog("Buddy", 5, "Golden Retriever")
```

## Encapsulation

Control access to attributes:

```python
class BankAccount:
    def __init__(self, balance):
        self._balance = balance  # "protected" by convention

    @property
    def balance(self):
        """Read-only access to balance."""
        return self._balance

    def deposit(self, amount):
        if amount > 0:
            self._balance += amount
            return True
        return False

    def withdraw(self, amount):
        if 0 < amount <= self._balance:
            self._balance -= amount
            return True
        return False

account = BankAccount(1000)
print(account.balance)    # 1000
account.deposit(500)
print(account.balance)    # 1500
# account.balance = 0     # AttributeError (read-only)
```

## Properties

Create computed attributes:

```python
class Rectangle:
    def __init__(self, width, height):
        self._width = width
        self._height = height

    @property
    def width(self):
        return self._width

    @width.setter
    def width(self, value):
        if value <= 0:
            raise ValueError("Width must be positive")
        self._width = value

    @property
    def area(self):
        """Computed property - no setter."""
        return self._width * self._height

rect = Rectangle(10, 5)
print(rect.area)    # 50
rect.width = 20
print(rect.area)    # 100
```

## Class Methods and Static Methods

```python
class Pizza:
    def __init__(self, ingredients):
        self.ingredients = ingredients

    @classmethod
    def margherita(cls):
        """Factory method - creates a specific instance."""
        return cls(["mozzarella", "tomatoes", "basil"])

    @classmethod
    def pepperoni(cls):
        return cls(["mozzarella", "pepperoni", "tomatoes"])

    @staticmethod
    def calculate_price(num_ingredients):
        """Utility method - doesn't access instance or class."""
        return 5 + num_ingredients * 1.5

# Using class methods
pizza = Pizza.margherita()
print(pizza.ingredients)

# Using static method
price = Pizza.calculate_price(4)  # 11.0
```

## Magic Methods (Dunder Methods)

Special methods that customize behavior:

```python
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        """Developer representation."""
        return f"Vector({self.x}, {self.y})"

    def __str__(self):
        """User-friendly string."""
        return f"({self.x}, {self.y})"

    def __add__(self, other):
        """Enable + operator."""
        return Vector(self.x + other.x, self.y + other.y)

    def __eq__(self, other):
        """Enable == comparison."""
        return self.x == other.x and self.y == other.y

    def __len__(self):
        """Enable len()."""
        return int((self.x ** 2 + self.y ** 2) ** 0.5)

v1 = Vector(3, 4)
v2 = Vector(1, 2)
v3 = v1 + v2       # Vector(4, 6)
print(len(v1))     # 5
```

## Key Takeaways

1. Classes define blueprints; objects are instances
2. `__init__` initializes instance attributes
3. Inheritance enables code reuse with `class Child(Parent)`
4. Use `@property` for computed or controlled attributes
5. `@classmethod` for factory methods; `@staticmethod` for utilities
6. Magic methods customize operators and built-in functions
