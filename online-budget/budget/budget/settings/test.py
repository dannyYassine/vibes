import os

from .base import *  # noqa

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "budget_test",
        "USER": env("DATABASE_URL").split("//")[1].split(":")[0] if "DATABASE_URL" in os.environ else "budget",
        "PASSWORD": "budget_dev",
        "HOST": "db",
        "PORT": "5432",
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]