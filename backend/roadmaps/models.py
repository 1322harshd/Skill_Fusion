from django.db import models


class Roadmap(models.Model):
    fusion_id = models.CharField(max_length=64, db_index=True)
    title = models.CharField(max_length=300)
    weeks_json = models.JSONField(default=list)
    outcome_statement = models.TextField(blank=True, default="")
    constraints = models.JSONField(default=list)
    chosen = models.BooleanField(default=False)
    locked = models.BooleanField(default=False)
    # How many weeks the user has checked off; only meaningful on the chosen
    # row. Clamped server-side to len(weeks_json).
    progress_weeks = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
