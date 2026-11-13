"""Pull real job listings into the Fusion Score pipeline.

This is the runner the jobs pipeline never had: without it, scores_joblisting
stayed empty and every Fusion Score fell back to the labeled heuristic
("estimate — live job data will refine this pair"). Ingest listings for the
skills you demo with, and pairs with >= 10 stored listings switch to
source="jobdata" (the Score screen shows "computed live from N real job
listings").

Free sources:
    arbeitnow (default) — no key needed, remote-tech board, query filters
    client-side against title+description
    adzuna — per-country listings (NZ default); needs ADZUNA_ID/ADZUNA_KEY
    in the environment (https://developer.adzuna.com, free tier)

Usage:
    python3 manage.py ingest_jobs "python" "data storytelling"
    python3 manage.py ingest_jobs "figma" --max 30 --source adzuna

Notes:
    - Embeddings are best-effort (Ollama :11434); listings still store
      without them, so demand data works even when Ollama is down.
    - Re-running a query is safe: URLs already stored are skipped.
"""
from django.core.management.base import BaseCommand

from scores.jobs_pipeline import ingest_query


class Command(BaseCommand):
    help = ("Fetch real job listings (free APIs) into scores_joblisting so "
            "Fusion Scores for those skills use live demand data.")

    def add_arguments(self, parser):
        parser.add_argument("queries", nargs="+",
                            help="Skill names to sample listings for")
        parser.add_argument("--max", type=int, default=50,
                            help="Max listings per query (default 50)")
        parser.add_argument("--source", choices=["arbeitnow", "adzuna"],
                            default="arbeitnow",
                            help="Listing source (default: arbeitnow, no key)")

    def handle(self, *args, **options):
        total = 0
        for q in options["queries"]:
            try:
                n = ingest_query(q, max_results=options["max"],
                                 source=options["source"])
            except Exception as e:
                # one bad query must not lose the others' results
                self.stderr.write("%s: FAILED — %s" % (q, e))
                continue
            total += n
            self.stdout.write("%s: stored %d listings (%s)"
                              % (q, n, options["source"]))
        self.stdout.write("done: %d listings stored" % total)
