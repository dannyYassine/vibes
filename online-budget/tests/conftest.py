import pytest
from django.contrib.auth.models import User

from budget.budget.application.container import Container


@pytest.fixture
def container(db):
    return Container()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="danny", password="test")


@pytest.fixture
def client_logged(client, user):
    client.force_login(user)
    return client