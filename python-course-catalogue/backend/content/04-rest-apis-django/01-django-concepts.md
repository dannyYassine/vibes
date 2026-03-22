---
title: "Django Core Concepts"
description: "Understand Django's architecture: projects, apps, settings, and the request lifecycle."
duration_minutes: 25
order: 1
---

## What is Django?

Django is a high-level Python web framework that follows the "batteries included" philosophy. It provides:

- ORM for database operations
- Admin interface out of the box
- URL routing
- Template engine
- Authentication system
- Security features (CSRF, XSS protection)

## Projects vs Apps

```
myproject/                 # Project root
├── manage.py              # CLI utility
├── myproject/             # Project configuration
│   ├── __init__.py
│   ├── settings.py        # Configuration
│   ├── urls.py            # Root URL routing
│   ├── asgi.py            # ASGI entry point
│   └── wsgi.py            # WSGI entry point
└── myapp/                 # Application
    ├── __init__.py
    ├── admin.py           # Admin configuration
    ├── apps.py            # App configuration
    ├── migrations/        # Database migrations
    ├── models.py          # Data models
    ├── tests.py           # Tests
    ├── urls.py            # App URL routing
    └── views.py           # Request handlers
```

**Project**: The entire web application configuration.
**App**: A module providing specific functionality (reusable).

## Creating a Project

```bash
# Install Django
pip install django

# Create project
django-admin startproject myproject
cd myproject

# Create app
python manage.py startapp users

# Run development server
python manage.py runserver
```

## Settings Configuration

```python
# myproject/settings.py

# Security
SECRET_KEY = 'your-secret-key'  # Use environment variable in production
DEBUG = True  # False in production
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Installed apps
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Your apps
    'users.apps.UsersConfig',
]

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# For PostgreSQL:
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': 'mydb',
#         'USER': 'myuser',
#         'PASSWORD': 'mypassword',
#         'HOST': 'localhost',
#         'PORT': '5432',
#     }
# }
```

## The Request Lifecycle

1. **Request arrives** at WSGI/ASGI server
2. **Middleware** processes request (authentication, sessions)
3. **URL resolver** matches URL to view
4. **View** executes and returns response
5. **Middleware** processes response
6. **Response** sent to client

```python
# Middleware example
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]
```

## URL Routing

```python
# myproject/urls.py (root)
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
]

# users/urls.py (app)
from django.urls import path
from . import views

urlpatterns = [
    path('', views.user_list, name='user-list'),
    path('<int:pk>/', views.user_detail, name='user-detail'),
]
```

## Views

```python
# Function-based view
from django.http import JsonResponse

def user_list(request):
    if request.method == 'GET':
        users = [{'id': 1, 'name': 'Alice'}]
        return JsonResponse({'users': users})

# Class-based view
from django.views import View

class UserListView(View):
    def get(self, request):
        users = [{'id': 1, 'name': 'Alice'}]
        return JsonResponse({'users': users})

    def post(self, request):
        # Create user
        pass
```

## Management Commands

```bash
# Database
python manage.py makemigrations   # Create migrations
python manage.py migrate          # Apply migrations
python manage.py showmigrations   # List migrations

# Development
python manage.py runserver        # Start dev server
python manage.py shell            # Interactive shell
python manage.py createsuperuser  # Create admin user

# Testing
python manage.py test             # Run tests

# Custom command
python manage.py mycommand        # Run custom command
```

## Environment Configuration

```python
# settings.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Read from environment
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-change-in-prod')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

# Or use python-decouple
from decouple import config

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
```

## Key Takeaways

1. Django projects contain multiple apps
2. `settings.py` centralizes configuration
3. URL routing maps URLs to views
4. Middleware processes every request/response
5. `manage.py` provides CLI tools
6. Use environment variables for sensitive config
