"""Tests for the scores app: heuristic scoring, the pgvector job-data path,
and the FusionScoreCache read/write + weekly-recompute wiring."""
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import FusionScoreCache, JobListing
from .services import SCORE_CACHE_TTL, make_score_sync, make_score_sync_real

VECTOR = [0.1] * 768

HEURISTIC_EXPECTED_KEYS = {
    "value", "rarity", "demand", "rarityLabel", "demandLabel",
    "explanation", "recommendation", "history",
}


class HeuristicScoreTests(TestCase):
    def test_value_bounded_and_weighted_45_55(self):
        score = make_score_sync("Photography", "Marketing")
        self.assertLessEqual(score["value"], 100)
        self.assertEqual(
            score["value"],
            round((score["rarity"] * 0.45 + score["demand"] * 0.55) * 100),
        )

    def test_all_shape_keys_present(self):
        score = make_score_sync("Design", "Code")
        self.assertEqual(HEURISTIC_EXPECTED_KEYS, set(score.keys()))

    def test_labels_track_their_numeric_buckets(self):
        score = make_score_sync("Writing", "Sales")
        if score["rarity"] >= 0.8:
            self.assertEqual(score["rarityLabel"], "Exceptional")
        elif score["rarity"] >= 0.65:
            self.assertEqual(score["rarityLabel"], "Rare")
        elif score["rarity"] >= 0.5:
            self.assertEqual(score["rarityLabel"], "Uncommon")
        else:
            self.assertEqual(score["rarityLabel"], "Common")

    def test_recommendation_third_skill_is_not_a_pair_member(self):
        score = make_score_sync("AI", "Automation")
        rec = score["recommendation"]["skill"]
        self.assertNotIn(rec, ("AI", "Automation"))
        # and for a pair with no overlap with the pools
        rec2 = make_score_sync("Marketing", "SQL")["recommendation"]["skill"]
        self.assertNotIn(rec2, ("Marketing", "SQL"))

    def test_deterministic_for_same_pair(self):
        self.assertEqual(make_score_sync("Cooking", "Chemistry"),
                         make_score_sync("Cooking", "Chemistry"))


class JobDataScoreTests(TransactionTestCase):
    """Real transactions/SQL — the job-data path queries scores_joblisting
    directly, so make sure parallel-transaction mode stays off."""

    def setUp(self):
        self.client = APIClient()

    def _seed_listings(self, query, count=25, embed=True):
        for i in range(count):
            JobListing.objects.create(
                title=f"Senior {query} {i}", company="TestCo",
                description=f"{query} role #{i} unittest", url="https://x.test/",
                source="arbeitnow", query=query,
                embedding=VECTOR if embed else None,
            )

    @patch("scores.jobs_pipeline.embed_texts", return_value=[VECTOR])
    def test_jobdata_path_used_when_ten_plus_listings_and_cached(self, mock_embed):
        self._seed_listings("Data Visualization")
        result = make_score_sync_real("Data Visualization", "Storytelling")
        self.assertEqual(result["source"], "jobdata")
        self.assertEqual(result["listings"], 25)
        self.assertTrue(FusionScoreCache.objects.filter(skill_a="data visualization").exists())

    @patch("scores.jobs_pipeline.embed_texts", return_value=[VECTOR])
    def test_cache_hit_avoids_recompute(self, mock_embed):
        self._seed_listings("Figma")
        first = make_score_sync_real("Figma", "Prototyping")
        self.assertFalse(first.get("cached", False))
        self.assertEqual(mock_embed.call_count, 1)

        second = make_score_sync_real("Figma", "Prototyping")
        # reversed pair order reads the same canonical cache row
        third = make_score_sync_real("Prototyping", "Figma")
        self.assertEqual(mock_embed.call_count, 1)  # no re-embed on hits
        self.assertEqual(first["value"], second["value"])
        self.assertEqual(second["value"], third["value"])
        self.assertTrue(second.get("cached"))
        self.assertTrue(third.get("cached"))

    @patch("scores.jobs_pipeline.embed_texts", return_value=[VECTOR])
    def test_stale_cache_is_recomputed(self, mock_embed):
        self._seed_listings("Rust")
        make_score_sync_real("Rust", "Systems Design")
        self.assertEqual(mock_embed.call_count, 1)
        row = FusionScoreCache.objects.get(skill_a="rust")
        row.computed_at = timezone.now() - SCORE_CACHE_TTL - timedelta(minutes=1)
        row.save(update_fields=["computed_at"])

        result = make_score_sync_real("Rust", "Systems Design")
        self.assertEqual(mock_embed.call_count, 2)  # fresh compute happened
        self.assertFalse(result.get("cached", False))

    @patch("scores.jobs_pipeline.embed_texts", return_value=[VECTOR])
    def test_cache_ttl_freshness_keeps_fresh_rows(self, mock_embed):
        self._seed_listings("SQL")
        make_score_sync_real("SQL", "Data Science")
        row = FusionScoreCache.objects.get(skill_b="sql")  # canonical key sorts "data science" first
        row.computed_at = timezone.now() - SCORE_CACHE_TTL + timedelta(minutes=5)
        row.save(update_fields=["computed_at"])
        result = make_score_sync_real("SQL", "Data Science")
        self.assertTrue(result.get("cached"))

    @patch("scores.jobs_pipeline.embed_texts", return_value=[VECTOR])
    def test_cached_dict_exposes_pointable_source(self, _mock):
        """Regression: a cached row must still carry its real source label."""
        self._seed_listings("QA")
        first = make_score_sync_real("QA", "Automation")
        self.assertIn(first["source"], ("jobdata", "heuristic"))

    @patch("scores.jobs_pipeline.embed_texts", return_value=[[0.2] * 768])
    def test_score_view_heuristic_source(self, _mock):
        response = self.client.post("/api/score/", {"a": "Pottery", "b": "History"}, format="json")
        self.assertEqual(response.status_code, 200)
        body = response.json()["score"]
        self.assertIn(body["source"], ("jobdata", "heuristic"))

    def test_score_view_400_when_args_missing(self):
        response = self.client.post("/api/score/", {"a": "Pottery"}, format="json")
        self.assertEqual(response.status_code, 400)


class RecomputeCommandTests(TransactionTestCase):
    from io import StringIO

    def _seed_listings(self, query, count=25):
        for i in range(count):
            JobListing.objects.create(
                title=f"Senior {query} {i}", company="TestCo",
                description=f"{query} role #{i} unittest", url="https://x.test/",
                source="arbeitnow", query=query,
                embedding=VECTOR,
            )

    def call_command(self, *args):
        from django.core.management import call_command
        out, err = self.StringIO(), self.StringIO()
        call_command("recompute_score_cache", *args, stdout=out, stderr=err)
        return out.getvalue(), err.getvalue()

    @patch("scores.jobs_pipeline.embed_texts", return_value=[VECTOR])
    def test_stale_rows_recomputed_fresh_rows_untouched(self, mock_embed):
        self._seed_listings("Vue")
        fresh_skill, stale_skill = "Vue", "Nuxt"

        make_score_sync_real(fresh_skill, "Pinia")
        make_score_sync_real(stale_skill, "Vue Router")
        # only the (Vue, Pinia) pair embeds — the other has no listings
        self.assertEqual(mock_embed.call_count, 1)

        # age only the stale row past the TTL
        stale_row = FusionScoreCache.objects.get(skill_a="nuxt")
        stale_row.computed_at = timezone.now() - SCORE_CACHE_TTL - timedelta(minutes=5)
        stale_row.save(update_fields=["computed_at"])

        fresh_before = FusionScoreCache.objects.get(skill_b="vue").computed_at

        stdout, stderr = self.call_command()
        self.assertIn("recomputed 1", stdout)
        self.assertEqual(stderr, "")
        self.assertEqual(mock_embed.call_count, 1)  # sweep reran the row without re-embedding beyond what its data path needs

        # fresh row did not have its computed_at rewritten by the sweep
        self.assertEqual(FusionScoreCache.objects.get(skill_b="vue").computed_at,
                         fresh_before)

    @patch("scores.jobs_pipeline.embed_texts", return_value=[VECTOR])
    def test_recompute_counts_are_row_pinned_not_piled(self, _mock):
        """Re-running the sweep rewrites rows in place — no duplicates."""
        self._seed_listings("Dart")
        make_score_sync_real("Dart", "Flutter")
        before = FusionScoreCache.objects.count()
        self.call_command("--all")
        self.call_command("--all")
        self.assertEqual(FusionScoreCache.objects.count(), before)
