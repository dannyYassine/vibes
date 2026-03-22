---
title: "Metaclasses"
description: "Understand Python's class creation mechanism and write custom metaclasses."
duration_minutes: 35
order: 1
---

## What are Metaclasses?

In Python, everything is an object — including classes. A metaclass is the "class of a class":

```python
class MyClass:
    pass

obj = MyClass()

print(type(obj))       # <class '__main__.MyClass'>
print(type(MyClass))   # <class 'type'>
```

`type` is the default metaclass. It creates class objects.

## type() as a Class Factory

You can create classes dynamically with `type()`:

```python
# Normal class definition
class Dog:
    species = "Canis familiaris"

    def bark(self):
        return "Woof!"

# Equivalent using type()
Dog = type(
    "Dog",                          # class name
    (),                             # base classes
    {
        "species": "Canis familiaris",
        "bark": lambda self: "Woof!"
    }
)

dog = Dog()
print(dog.bark())  # Woof!
```

## Creating a Custom Metaclass

```python
class Meta(type):
    def __new__(mcs, name, bases, namespace):
        print(f"Creating class: {name}")
        return super().__new__(mcs, name, bases, namespace)

class MyClass(metaclass=Meta):
    pass
# Output: Creating class: MyClass
```

### Metaclass Methods

- `__new__`: Creates the class object
- `__init__`: Initializes the class object
- `__call__`: Called when creating instances

```python
class Meta(type):
    def __new__(mcs, name, bases, namespace):
        print(f"__new__: Creating {name}")
        cls = super().__new__(mcs, name, bases, namespace)
        return cls

    def __init__(cls, name, bases, namespace):
        print(f"__init__: Initializing {name}")
        super().__init__(name, bases, namespace)

    def __call__(cls, *args, **kwargs):
        print(f"__call__: Creating instance of {cls.__name__}")
        return super().__call__(*args, **kwargs)

class MyClass(metaclass=Meta):
    pass
# __new__: Creating MyClass
# __init__: Initializing MyClass

obj = MyClass()
# __call__: Creating instance of MyClass
```

## Practical Use Cases

### Automatic Registration

```python
class PluginRegistry(type):
    plugins = {}

    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        if name != "Plugin":  # Don't register base class
            mcs.plugins[name] = cls
        return cls

class Plugin(metaclass=PluginRegistry):
    pass

class ImageProcessor(Plugin):
    pass

class VideoProcessor(Plugin):
    pass

print(PluginRegistry.plugins)
# {'ImageProcessor': <class 'ImageProcessor'>,
#  'VideoProcessor': <class 'VideoProcessor'>}
```

### Singleton Pattern

```python
class Singleton(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class Database(metaclass=Singleton):
    def __init__(self):
        print("Connecting to database...")

db1 = Database()  # Connecting to database...
db2 = Database()  # No output - returns same instance
print(db1 is db2)  # True
```

### Attribute Validation

```python
class ValidatedMeta(type):
    def __new__(mcs, name, bases, namespace):
        # Ensure all methods have docstrings
        for key, value in namespace.items():
            if callable(value) and not key.startswith("_"):
                if not value.__doc__:
                    raise TypeError(
                        f"Method {key} in {name} must have a docstring"
                    )
        return super().__new__(mcs, name, bases, namespace)

class MyClass(metaclass=ValidatedMeta):
    def my_method(self):
        """This method has a docstring."""
        pass

    def bad_method(self):  # TypeError: must have docstring
        pass
```

### Interface Enforcement

```python
class InterfaceMeta(type):
    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)

        # Check required methods
        required = getattr(cls, "_required_methods", [])
        for method in required:
            if method not in namespace or not callable(namespace[method]):
                raise TypeError(
                    f"Class {name} must implement {method}()"
                )
        return cls

class Serializable(metaclass=InterfaceMeta):
    _required_methods = ["serialize", "deserialize"]

class JSONData(Serializable):
    def serialize(self):
        return "{}"

    def deserialize(self, data):
        pass
```

## __init_subclass__ Alternative

For simpler cases, use `__init_subclass__` instead of metaclasses:

```python
class Plugin:
    plugins = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        Plugin.plugins[cls.__name__] = cls

class ImagePlugin(Plugin):
    pass

class VideoPlugin(Plugin):
    pass

print(Plugin.plugins)
# {'ImagePlugin': <class 'ImagePlugin'>,
#  'VideoPlugin': <class 'VideoPlugin'>}
```

## When to Use Metaclasses

Metaclasses are powerful but rarely needed. Consider alternatives first:

1. **Decorators**: For modifying individual classes
2. **`__init_subclass__`**: For subclass registration/validation
3. **Class decorators**: For class-level modifications
4. **Descriptors**: For attribute access control

Use metaclasses when you need to:
- Modify class creation for an entire hierarchy
- Create domain-specific languages (ORMs, serializers)
- Implement frameworks that require automatic registration

## Key Takeaways

1. Metaclasses are "classes of classes" — they control class creation
2. `type` is the default metaclass
3. Override `__new__` to modify class creation
4. Common uses: registration, singletons, validation
5. `__init_subclass__` is often a simpler alternative
6. Use metaclasses sparingly — they add complexity
