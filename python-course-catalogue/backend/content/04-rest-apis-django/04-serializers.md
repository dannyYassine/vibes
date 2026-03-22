---
title: "Serializers"
description: "Convert between complex data types and Python primitives for JSON APIs."
duration_minutes: 30
order: 4
---

## Why Serializers?

Serializers handle:
- Converting model instances to JSON-serializable data
- Validating incoming data
- Creating/updating model instances from validated data

## Django REST Framework Setup

```bash
pip install djangorestframework
```

```python
# settings.py
INSTALLED_APPS = [
    ...
    'rest_framework',
]

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
}
```

## Basic Serializer

```python
from rest_framework import serializers

class BookSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(max_length=200)
    author = serializers.CharField(max_length=100)
    price = serializers.DecimalField(max_digits=6, decimal_places=2)
    published_date = serializers.DateField()
    is_available = serializers.BooleanField(default=True)

    def create(self, validated_data):
        return Book.objects.create(**validated_data)

    def update(self, instance, validated_data):
        instance.title = validated_data.get('title', instance.title)
        instance.author = validated_data.get('author', instance.author)
        instance.price = validated_data.get('price', instance.price)
        instance.save()
        return instance
```

## ModelSerializer

Automatically generates fields from model:

```python
from rest_framework import serializers
from .models import Book, Author

class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ['id', 'title', 'author', 'price', 'published_date']
        # Or use '__all__' for all fields
        # exclude = ['internal_field']  # Exclude specific fields

class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ['id', 'name', 'email', 'bio']
        read_only_fields = ['id', 'created_at']
```

## Serializing Data

```python
# Single object
book = Book.objects.get(pk=1)
serializer = BookSerializer(book)
serializer.data
# {'id': 1, 'title': 'Python Guide', 'price': '29.99', ...}

# Multiple objects
books = Book.objects.all()
serializer = BookSerializer(books, many=True)
serializer.data
# [{'id': 1, ...}, {'id': 2, ...}]
```

## Deserializing and Validation

```python
# Validate incoming data
data = {'title': 'New Book', 'price': '19.99'}
serializer = BookSerializer(data=data)

if serializer.is_valid():
    book = serializer.save()  # Calls create()
else:
    print(serializer.errors)
    # {'author': ['This field is required.']}

# Raise exception on invalid
serializer.is_valid(raise_exception=True)

# Update existing object
book = Book.objects.get(pk=1)
serializer = BookSerializer(book, data=data)
if serializer.is_valid():
    serializer.save()  # Calls update()

# Partial update
serializer = BookSerializer(book, data={'price': '24.99'}, partial=True)
```

## Field Options

```python
class BookSerializer(serializers.ModelSerializer):
    # Read-only field
    id = serializers.IntegerField(read_only=True)

    # Write-only (e.g., password)
    password = serializers.CharField(write_only=True)

    # Required with default
    status = serializers.CharField(default='draft')

    # Allow null/blank
    description = serializers.CharField(allow_null=True, allow_blank=True)

    # Choices
    category = serializers.ChoiceField(choices=['fiction', 'non-fiction'])

    # Custom source
    author_name = serializers.CharField(source='author.name', read_only=True)
```

## Nested Serializers

```python
class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ['id', 'name']

class BookSerializer(serializers.ModelSerializer):
    # Nested representation
    author = AuthorSerializer(read_only=True)

    # For writing, accept author ID
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=Author.objects.all(),
        source='author',
        write_only=True
    )

    class Meta:
        model = Book
        fields = ['id', 'title', 'author', 'author_id', 'price']
```

## Custom Validation

```python
class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ['title', 'price', 'published_date']

    # Field-level validation
    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be positive")
        return value

    # Object-level validation
    def validate(self, data):
        if data.get('published_date') and data['published_date'] > date.today():
            raise serializers.ValidationError(
                "Published date cannot be in the future"
            )
        return data
```

## SerializerMethodField

Add computed fields:

```python
class BookSerializer(serializers.ModelSerializer):
    discounted_price = serializers.SerializerMethodField()
    author_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = ['id', 'title', 'price', 'discounted_price', 'author_full_name']

    def get_discounted_price(self, obj):
        return float(obj.price) * 0.9

    def get_author_full_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}"
```

## Handling Relationships

```python
# String representation
author = serializers.StringRelatedField()
# Output: "J.K. Rowling"

# Primary key
author = serializers.PrimaryKeyRelatedField(queryset=Author.objects.all())
# Output: 1

# Hyperlink
author = serializers.HyperlinkedRelatedField(
    view_name='author-detail',
    queryset=Author.objects.all()
)
# Output: "http://example.com/api/authors/1/"

# Slug field
author = serializers.SlugRelatedField(
    slug_field='username',
    queryset=Author.objects.all()
)
# Output: "jkrowling"

# Nested (full object)
author = AuthorSerializer(read_only=True)
# Output: {"id": 1, "name": "J.K. Rowling", ...}
```

## Context and Request Access

```python
class BookSerializer(serializers.ModelSerializer):
    is_owner = serializers.SerializerMethodField()

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.created_by == request.user
        return False

# Pass context when creating serializer
serializer = BookSerializer(book, context={'request': request})
```

## Key Takeaways

1. Serializers convert between Python objects and JSON
2. `ModelSerializer` auto-generates fields from models
3. Use `is_valid()` to validate incoming data
4. Custom validation via `validate_<field>` or `validate()`
5. `SerializerMethodField` adds computed properties
6. Handle relationships with nested or related serializers
