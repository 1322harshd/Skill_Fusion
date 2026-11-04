import uuid

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserManager(BaseUserManager):
    """Custom manager since the User model logs in with email instead of username."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        # Superusers get the admin role too, since role is otherwise just a profile field.
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        ADMIN = "admin", "Admin"

    # Django's default username field is dropped in favor of email as the login identifier.
    username = None
    # UUID primary key instead of the default auto-incrementing id, so user ids aren't guessable.
    userId = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fullName = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    isEmailVerified = models.BooleanField(default=False)

    # Onboarding/profile data captured as loose JSON rather than normalized tables,
    # since the shape of personas/baseline answers/skills varies per user.
    personaTypes = models.JSONField(default=list, blank=True)
    baseline = models.JSONField(default=dict, blank=True)
    skills = models.JSONField(default=list, blank=True)
    githubUrl = models.URLField(blank=True, default="")
    # OAuth access token for the connected GitHub account (repo scope), used to list
    # private repos on the user's behalf. Never exposed via the API — stored server-side only.
    githubAccessToken = models.CharField(max_length=255, blank=True, default="")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["fullName"]

    objects = UserManager()

    def __str__(self):
        return self.email
