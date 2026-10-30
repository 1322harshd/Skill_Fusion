from django.conf import settings
from django.db import models


class ProjectSubmission(models.Model):
    """Delivery proof for a fused-skill project: an uploaded artifact
    (.pdf/.txt/.md) and/or a source link, plus SF's assessment verdict.
    user/fusion nullable so anonymous demo fusions can still submit."""

    id = models.AutoField(primary_key=True)
    fusion_ref = models.CharField(max_length=64, blank=True)  # fusion id string (anon demo fusions have no row)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="project_submissions", null=True)
    filename = models.CharField(max_length=200, blank=True)
    file_text = models.TextField(blank=True)  # extracted for SF; not re-served
    source_link = models.URLField(blank=True)
    attachment_note = models.CharField(max_length=300, blank=True)  # e.g. image kept as visual proof
    verdict = models.JSONField(default=dict, blank=True)  # {matchScore, closeness, strengths, gaps, verdict}
    match_score = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
