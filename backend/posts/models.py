import uuid

from django.conf import settings
from django.db import models

from growthlog.models import GrowthLogEntry


class PostDraft(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        QUEUED = "queued", "Queued"
        SHARED = "shared", "Shared"

    postId = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="post_drafts")
    entry = models.ForeignKey(GrowthLogEntry, on_delete=models.CASCADE, related_name="post_drafts")
    tone = models.CharField(max_length=20, default="Warm")
    text = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updatedAt"]

    def __str__(self):
        return f"{self.status} post for {self.entry.title} ({self.user.email})"
