---
title: "Views and URL Routing"
description: "Handle HTTP requests with function and class-based views."
duration_minutes: 25
order: 3
---

## Function-Based Views

Simple functions that take a request and return a response:

```python
from django.http import JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404
from .models import Book

def book_list(request):
    if request.method == 'GET':
        books = Book.objects.all().values('id', 'title', 'price')
        return JsonResponse(list(books), safe=False)

    elif request.method == 'POST':
        import json
        data = json.loads(request.body)
        book = Book.objects.create(**data)
        return JsonResponse({'id': book.id}, status=201)

def book_detail(request, pk):
    book = get_object_or_404(Book, pk=pk)

    if request.method == 'GET':
        return JsonResponse({
            'id': book.id,
            'title': book.title,
            'price': str(book.price)
        })

    elif request.method == 'DELETE':
        book.delete()
        return HttpResponse(status=204)
```

## URL Routing

```python
# urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Basic paths
    path('books/', views.book_list, name='book-list'),
    path('books/<int:pk>/', views.book_detail, name='book-detail'),

    # Path converters
    path('books/<slug:slug>/', views.book_by_slug),
    path('archive/<int:year>/<int:month>/', views.archive),

    # UUID
    path('orders/<uuid:order_id>/', views.order_detail),
]

# Available converters:
# int  - Matches positive integers
# str  - Matches any non-empty string (default)
# slug - Matches slug strings (letters, numbers, hyphens, underscores)
# uuid - Matches UUID strings
# path - Matches any string including /
```

### Including App URLs

```python
# project/urls.py
from django.urls import path, include

urlpatterns = [
    path('api/v1/', include('myapp.urls')),
    path('api/v1/users/', include('users.urls')),
]
```

## Class-Based Views

More structured approach with inheritance:

```python
from django.views import View
from django.http import JsonResponse
import json

class BookListView(View):
    def get(self, request):
        books = Book.objects.all().values('id', 'title')
        return JsonResponse(list(books), safe=False)

    def post(self, request):
        data = json.loads(request.body)
        book = Book.objects.create(**data)
        return JsonResponse({'id': book.id}, status=201)

class BookDetailView(View):
    def get(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        return JsonResponse({
            'id': book.id,
            'title': book.title
        })

    def put(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        data = json.loads(request.body)
        for key, value in data.items():
            setattr(book, key, value)
        book.save()
        return JsonResponse({'id': book.id})

    def delete(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        book.delete()
        return HttpResponse(status=204)
```

### URL Configuration for CBVs

```python
urlpatterns = [
    path('books/', BookListView.as_view(), name='book-list'),
    path('books/<int:pk>/', BookDetailView.as_view(), name='book-detail'),
]
```

## Generic Class-Based Views

Django provides built-in views for common patterns:

```python
from django.views.generic import (
    ListView, DetailView, CreateView, UpdateView, DeleteView
)

class BookListView(ListView):
    model = Book
    template_name = 'books/list.html'
    context_object_name = 'books'
    paginate_by = 10

    def get_queryset(self):
        return Book.objects.filter(is_available=True)

class BookDetailView(DetailView):
    model = Book
    template_name = 'books/detail.html'

class BookCreateView(CreateView):
    model = Book
    fields = ['title', 'author', 'price']
    success_url = '/books/'

class BookUpdateView(UpdateView):
    model = Book
    fields = ['title', 'price']
    success_url = '/books/'

class BookDeleteView(DeleteView):
    model = Book
    success_url = '/books/'
```

## Request Object

```python
def my_view(request):
    # Method
    method = request.method  # 'GET', 'POST', etc.

    # Query parameters (?key=value)
    value = request.GET.get('key', 'default')
    values = request.GET.getlist('keys')

    # POST data (form encoded)
    value = request.POST.get('field')

    # JSON body
    import json
    data = json.loads(request.body)

    # Headers
    content_type = request.headers.get('Content-Type')
    auth = request.headers.get('Authorization')

    # User (if authenticated)
    user = request.user
    if request.user.is_authenticated:
        username = request.user.username

    # Path info
    path = request.path  # '/api/books/'
    full_path = request.get_full_path()  # '/api/books/?page=2'
```

## Response Types

```python
from django.http import (
    HttpResponse,
    JsonResponse,
    HttpResponseRedirect,
    HttpResponseNotFound,
    HttpResponseForbidden,
)

# Plain text
return HttpResponse('Hello', content_type='text/plain')

# JSON
return JsonResponse({'key': 'value'})
return JsonResponse([1, 2, 3], safe=False)  # For non-dict

# Status codes
return JsonResponse({'error': 'Not found'}, status=404)
return HttpResponse(status=204)  # No content

# Redirect
return HttpResponseRedirect('/other-url/')

# Shortcuts
from django.shortcuts import redirect
return redirect('book-list')  # Using URL name
return redirect('/books/')    # Using path
```

## Decorators

```python
from django.views.decorators.http import require_http_methods, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

@require_http_methods(['GET', 'POST'])
def my_view(request):
    pass

@require_GET
def read_only_view(request):
    pass

@csrf_exempt  # Disable CSRF for API endpoints
def api_view(request):
    pass

@login_required
def protected_view(request):
    pass
```

## Key Takeaways

1. Function views are simple; class views offer structure
2. URL patterns map paths to views with converters
3. Use `get_object_or_404` for safe lookups
4. Generic views handle common CRUD patterns
5. Request object provides method, data, headers, user
6. Use appropriate response types and status codes
