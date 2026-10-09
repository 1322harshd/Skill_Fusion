import uuid

from django.conf import settings
from django.db import models


class ResumeDocument(models.Model):
    documentId = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resume_documents"
    )
    jobListing = models.TextField(blank=True, default="")
    resumeSummary = models.TextField(blank=True, default="")
    resumeBullets = models.JSONField(default=list, blank=True)
    coverLetter = models.TextField(blank=True, default="")
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-createdAt"]

    def __str__(self):
        return f"Resume for {self.user.email} ({self.createdAt:%Y-%m-%d})"
