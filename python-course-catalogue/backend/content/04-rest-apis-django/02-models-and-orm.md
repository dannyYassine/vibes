---
title: "Models and the ORM"
description: "Define database schemas with Django models and query data using the ORM."
duration_minutes: 35
order: 2
---

## Defining Models

Models map Python classes to database tables:

```python
# models.py
from django.db import models

class Author(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']

class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(
        Author,
        on_delete=models.CASCADE,
        related_name='books'
    )
    isbn = models.CharField(max_length=13, unique=True)
    published_date = models.DateField()
    price = models.DecimalField(max_digits=6, decimal_places=2)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return self.title
```

## Field Types

```python
# Text fields
name = models.CharField(max_length=100)
description = models.TextField()
slug = models.SlugField(unique=True)

# Numeric fields
age = models.IntegerField()
price = models.DecimalField(max_digits=10, decimal_places=2)
rating = models.FloatField()

# Boolean
is_active = models.BooleanField(default=True)

# Date/time
created_at = models.DateTimeField(auto_now_add=True)
updated_at = models.DateTimeField(auto_now=True)
birth_date = models.DateField()

# File fields
image = models.ImageField(upload_to='images/')
document = models.FileField(upload_to='docs/')

# Other
email = models.EmailField()
url = models.URLField()
uuid = models.UUIDField(default=uuid.uuid4)
json_data = models.JSONField(default=dict)
```

## Relationships

```python
# One-to-Many (ForeignKey)
class Comment(models.Model):
    post = models.ForeignKey(
        'Post',
        on_delete=models.CASCADE,
        related_name='comments'
    )

# Many-to-Many
class Post(models.Model):
    tags = models.ManyToManyField('Tag', related_name='posts')

# One-to-One
class Profile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )

# on_delete options:
# CASCADE    - Delete related objects
# PROTECT    - Prevent deletion
# SET_NULL   - Set to NULL (requires null=True)
# SET_DEFAULT - Set to default value
# DO_NOTHING - Do nothing (manual handling)
```

## Migrations

```bash
# Create migration files
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# View SQL for migration
python manage.py sqlmigrate myapp 0001

# Revert migration
python manage.py migrate myapp 0001
```

## QuerySet API

### Creating Objects

```python
# Create and save
author = Author.objects.create(
    name='Alice',
    email='alice@example.com'
)

# Create without saving
author = Author(name='Bob', email='bob@example.com')
author.save()

# Bulk create
Author.objects.bulk_create([
    Author(name='Charlie', email='c@ex.com'),
    Author(name='Diana', email='d@ex.com'),
])
```

### Querying Objects

```python
# Get all
authors = Author.objects.all()

# Filter
active_books = Book.objects.filter(is_available=True)

# Complex filters
from django.db.models import Q

books = Book.objects.filter(
    Q(price__lt=20) | Q(author__name='Alice'),
    published_date__year=2024
)

# Exclude
books = Book.objects.exclude(is_available=False)

# Get single object
author = Author.objects.get(pk=1)  # Raises DoesNotExist if not found

# Get or create
author, created = Author.objects.get_or_create(
    email='alice@example.com',
    defaults={'name': 'Alice'}
)

# First/last
first = Author.objects.first()
last = Author.objects.last()

# Ordering
books = Book.objects.order_by('-published_date', 'title')
```

### Field Lookups

```python
# Exact match
Author.objects.filter(name='Alice')
Author.objects.filter(name__exact='Alice')

# Case-insensitive
Author.objects.filter(name__iexact='alice')

# Contains
Author.objects.filter(name__contains='lic')
Author.objects.filter(name__icontains='lic')

# Starts/ends with
Author.objects.filter(name__startswith='A')
Author.objects.filter(email__endswith='.com')

# In list
Author.objects.filter(id__in=[1, 2, 3])

# Range
Book.objects.filter(price__range=(10, 50))

# Comparisons
Book.objects.filter(price__lt=20)   # Less than
Book.objects.filter(price__lte=20)  # Less than or equal
Book.objects.filter(price__gt=20)   # Greater than
Book.objects.filter(price__gte=20)  # Greater than or equal

# Null check
Author.objects.filter(bio__isnull=True)

# Date parts
Book.objects.filter(published_date__year=2024)
Book.objects.filter(published_date__month=6)
```

### Related Objects

```python
# Forward relation
book = Book.objects.get(pk=1)
author = book.author

# Reverse relation
author = Author.objects.get(pk=1)
books = author.books.all()

# Filtering across relations
Book.objects.filter(author__name='Alice')

# Prefetch to avoid N+1
books = Book.objects.select_related('author').all()

# For many-to-many or reverse FK
authors = Author.objects.prefetch_related('books').all()
```

### Aggregation

```python
from django.db.models import Count, Avg, Sum, Max, Min

# Aggregate
result = Book.objects.aggregate(
    total=Count('id'),
    avg_price=Avg('price'),
    max_price=Max('price')
)
# {'total': 100, 'avg_price': 25.5, 'max_price': 99.99}

# Annotate (per-object aggregation)
authors = Author.objects.annotate(
    book_count=Count('books')
).filter(book_count__gt=5)
```

### Updating and Deleting

```python
# Update single
book = Book.objects.get(pk=1)
book.price = 19.99
book.save()

# Bulk update
Book.objects.filter(is_available=False).update(price=9.99)

# Delete
book.delete()

# Bulk delete
Book.objects.filter(published_date__year__lt=2000).delete()
```

## Key Takeaways

1. Models define database schema as Python classes
2. Use appropriate field types for data
3. Relationships: ForeignKey (1:N), ManyToMany (N:N), OneToOne (1:1)
4. Migrations track schema changes
5. QuerySets are lazy - evaluated when needed
6. Use `select_related`/`prefetch_related` to avoid N+1 queries
