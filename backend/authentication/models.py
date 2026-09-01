<<<<<<< HEAD
import uuid

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        ADMIN = "admin", "Admin"

    username = None
    userId = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fullName = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    isEmailVerified = models.BooleanField(default=False)

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
=======
from django.db import models
import uuid
 
class User(models.Model):

    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        ADMIN = "admin", "Admin"
    userId = models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False)
    fullName = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    passwordHash = models.CharField(max_length=128)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT
    )
>>>>>>> f844bd3 (Add Django backend scaffold with authentication app)
