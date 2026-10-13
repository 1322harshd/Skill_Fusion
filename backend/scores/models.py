from django.db import models
from pgvector.django import VectorField


class JobListing(models.Model):
    title = models.CharField(max_length=300)
    company = models.CharField(max_length=200, blank=True, default="")
    description = models.TextField(blank=True, default="")
    url = models.URLField(max_length=500, blank=True, default="")
    source = models.CharField(max_length=30, default="adzuna")
    query = models.CharField(max_length=200, db_index=True, default="")
    embedding = VectorField(dimensions=768, null=True)
    fetched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["query"])]


class FusionScoreCache(models.Model):
    skill_a = models.CharField(max_length=100)
    skill_b = models.CharField(max_length=100)
    score_json = models.JSONField(default=dict)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("skill_a", "skill_b")]
