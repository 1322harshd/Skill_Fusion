"""Weekly Fusion Score recompute.

score_view / fuse_view serve callers from FusionScoreCache (7-day TTL), but
rows only refresh when someone asks for that pair again. This command sweeps
the cache: stale (or all) rows get recomputed against the current job-data
pipeline so scores reports stay honest between visits.

Usage:
    python3 manage.py recompute_score_cache            # stale rows only
    python3 manage.py recompute_score_cache --all      # force every row
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from scores.services import SCORE_CACHE_TTL, make_score_sync_real


class Command(BaseCommand):
    help = "Recompute stale (or all) cached Fusion Scores against current job data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Recompute every cached pair, not just rows older than the TTL.",
        )

    def handle(self, *args, **options):
        from scores.models import FusionScoreCache

        cutoff = timezone.now() - SCORE_CACHE_TTL
        rows = FusionScoreCache.objects.all()
        stale = rows if options["all"] else rows.filter(computed_at__lt=cutoff)
        names = list(stale.values_list("skill_a", "skill_b"))
        if not names:
            self.stdout.write("cache: nothing to recompute (%d rows total)" % rows.count())
            return
        refreshed = 0
        for ka, kb in names:
            # make_score_sync_real re-queriers the pipeline: stale rows miss the
            # freshness check inside get_cached_score, so this is a real
            # recompute, not a a cached echo.
            try:
                make_score_sync_real(ka, kb)
                refreshed += 1
            except Exception as e:  # embed/DB failure on one pair must not kill the sweep
                self.stderr.write("recompute failed for %s×%s: %s" % (ka, kb, e))
        self.stdout.write(
            "cache: recomputed %d of %d rows (%d total)"
            % (refreshed, len(names), rows.count())
        )
