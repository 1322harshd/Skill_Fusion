from django.db import models
from django.contrib.auth.models import User

class Fusion(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="fusions")
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
