import uuid

from django.conf import settings
from django.db import models


class GrowthLogEntry(models.Model):
    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        GITHUB = "github", "GitHub"

    entryId = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="growth_log_entries"
    )
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.MANUAL)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    sourceUrl = models.URLField(blank=True, default="")

    # Dual-axis tagging (FR-6.4): technical skill vs employability competency.
    skillTags = models.JSONField(default=list, blank=True)
    competencyTags = models.JSONField(default=list, blank=True)

    verified = models.BooleanField(default=False)
    loggedAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-loggedAt"]

    def __str__(self):
        return f"{self.title} ({self.user.email})"


class Credential(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        FAILED = "failed", "Failed"

    credentialId = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entry = models.OneToOneField(
        GrowthLogEntry, on_delete=models.CASCADE, related_name="credential"
    )
    issuer = models.CharField(max_length=200, blank=True, default="")
    verificationUrl = models.URLField()
    verificationStatus = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    requestedAt = models.DateTimeField(auto_now_add=True)
    verifiedAt = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.issuer or 'Credential'} — {self.verificationStatus}"
