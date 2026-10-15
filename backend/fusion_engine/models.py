from django.conf import settings
from django.db import models

class Fusion(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="fusions", null=True)
    a = models.CharField(max_length=64)
    b = models.CharField(max_length=64)
    category_a = models.CharField(max_length=20)
    category_b = models.CharField(max_length=20)
    score = models.JSONField(default=dict)  # {value, rarity, demand, ...}
    brief = models.JSONField(default=dict)  # {lede, complementarity, ...}
    roadmap = models.JSONField(default=dict)
    project = models.JSONField(default=dict)
    added_skills = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class QuizSession(models.Model):
    skills = models.JSONField(default=list)
    questions = models.JSONField(default=list)
    answers = models.JSONField(default=list)
    levels = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
