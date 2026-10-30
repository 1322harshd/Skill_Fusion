from datetime import timedelta

from django.utils import timezone

from growthlog.models import GrowthLogEntry


def compute_streak(user) -> int:
    """Consecutive days ending today (or yesterday, if nothing's logged yet
    today) with at least one Growth Log entry — the same definition as a
    GitHub/Duolingo-style streak."""
    logged_dates = set(
        GrowthLogEntry.objects.filter(user=user).values_list("loggedAt__date", flat=True)
    )
    if not logged_dates:
        return 0

    day = timezone.localdate()
    if day not in logged_dates:
        day -= timedelta(days=1)

    streak = 0
    while day in logged_dates:
        streak += 1
        day -= timedelta(days=1)
    return streak
