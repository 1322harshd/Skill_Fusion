import uuid

from django.conf import settings
from django.db import models


class ResumeUpload(models.Model):
    """The learner's own resume, uploaded during onboarding (or later) as an
    alternative to the skills quiz. Stores extracted text only — the generator
    reads this as extra grounding alongside Growth Log evidence."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resume_upload")
    filename = models.CharField(max_length=255, blank=True, default="")
    extractedText = models.TextField(blank=True, default="")
    uploadedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Uploaded resume for {self.user.email}"


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
