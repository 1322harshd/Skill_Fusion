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