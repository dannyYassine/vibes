---
title: "Django REST Framework"
description: "Build production-ready REST APIs with DRF viewsets, routers, and permissions."
duration_minutes: 35
order: 5
---

## ViewSets

Combine logic for related views:

```python
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Book
from .serializers import BookSerializer

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer

    # Custom action
    @action(detail=True, methods=['post'])
    def mark_unavailable(self, request, pk=None):
        book = self.get_object()
        book.is_available = False
        book.save()
        return Response({'status': 'marked unavailable'})

    @action(detail=False, methods=['get'])
    def available(self, request):
        books = self.queryset.filter(is_available=True)
        serializer = self.get_serializer(books, many=True)
        return Response(serializer.data)
```

### ViewSet Types

```python
# Full CRUD
class BookViewSet(viewsets.ModelViewSet):
    # Provides: list, create, retrieve, update, partial_update, destroy
    pass

# Read-only
class BookViewSet(viewsets.ReadOnlyModelViewSet):
    # Provides: list, retrieve
    pass

# Custom mixins
from rest_framework.mixins import (
    ListModelMixin, CreateModelMixin, RetrieveModelMixin
)

class BookViewSet(
    ListModelMixin,
    CreateModelMixin,
    RetrieveModelMixin,
    viewsets.GenericViewSet
):
    # Provides: list, create, retrieve
    pass
```

## Routers

Automatic URL generation:

```python
from rest_framework.routers import DefaultRouter
from .views import BookViewSet, AuthorViewSet

router = DefaultRouter()
router.register('books', BookViewSet)
router.register('authors', AuthorViewSet)

# urls.py
urlpatterns = [
    path('api/', include(router.urls)),
]

# Generated URLs:
# GET/POST    /api/books/
# GET/PUT/DELETE /api/books/{pk}/
# POST        /api/books/{pk}/mark_unavailable/
# GET         /api/books/available/
```

## Authentication

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
}

# Per-view authentication
from rest_framework.authentication import TokenAuthentication

class BookViewSet(viewsets.ModelViewSet):
    authentication_classes = [TokenAuthentication]
```

### Token Authentication Setup

```python
# settings.py
INSTALLED_APPS = [
    ...
    'rest_framework.authtoken',
]

# Create tokens
from rest_framework.authtoken.models import Token
token = Token.objects.create(user=user)

# urls.py
from rest_framework.authtoken.views import obtain_auth_token
urlpatterns = [
    path('api/token/', obtain_auth_token),
]

# Usage: Authorization: Token <token>
```

### JWT Authentication

```bash
pip install djangorestframework-simplejwt
```

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}

# urls.py
from rest_framework_simplejwt.views import (
    TokenObtainPairView, TokenRefreshView
)

urlpatterns = [
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
]
```

## Permissions

```python
from rest_framework.permissions import (
    IsAuthenticated,
    IsAdminUser,
    AllowAny,
    IsAuthenticatedOrReadOnly,
)

class BookViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]

# Global default
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

### Custom Permissions

```python
from rest_framework.permissions import BasePermission

class IsOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        # Read permissions for any request
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # Write permissions only for owner
        return obj.owner == request.user

class BookViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
```

## Filtering and Search

```bash
pip install django-filter
```

```python
# settings.py
INSTALLED_APPS = [..., 'django_filters']

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# views.py
class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer

    # Exact match filters
    filterset_fields = ['author', 'is_available']

    # Search across fields
    search_fields = ['title', 'author__name']

    # Allowed ordering
    ordering_fields = ['price', 'published_date']
    ordering = ['-published_date']

# Usage:
# GET /api/books/?author=1
# GET /api/books/?search=python
# GET /api/books/?ordering=-price
```

### Custom FilterSet

```python
import django_filters
from .models import Book

class BookFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    title = django_filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = Book
        fields = ['author', 'is_available', 'min_price', 'max_price', 'title']

class BookViewSet(viewsets.ModelViewSet):
    filterset_class = BookFilter
```

## Pagination

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# Custom pagination
from rest_framework.pagination import PageNumberPagination

class LargeResultsSetPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000

class BookViewSet(viewsets.ModelViewSet):
    pagination_class = LargeResultsSetPagination
```

## Throttling

Rate limiting:

```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    },
}
```

## Exception Handling

```python
from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data['status_code'] = response.status_code

    return response

# settings.py
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'myapp.exceptions.custom_exception_handler',
}
```

## Testing APIs

```python
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Book

class BookAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('test', 'test@test.com', 'pass')
        self.client.force_authenticate(user=self.user)

    def test_list_books(self):
        response = self.client.get('/api/books/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_book(self):
        data = {'title': 'Test Book', 'price': '19.99'}
        response = self.client.post('/api/books/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

## Key Takeaways

1. ViewSets combine related views; routers auto-generate URLs
2. Choose authentication: Session, Token, or JWT
3. Permissions control access at view and object level
4. Use django-filter for advanced filtering
5. Configure pagination and throttling globally or per-view
6. Test APIs with `APITestCase` and `APIClient`
