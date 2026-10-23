"""Tests for the roadmaps app: preview persistence + ownership, choose/lock,
tweak flow, and the 1+3 SF call split in get_previews."""
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from .models import Roadmap
from authentication.models import User
from fusion_engine.models import Fusion

PASSWORD = "CorrectHorse1!"
USER = "ada@example.com"
USER2 = "grace@example.com"


def _previews():
    """Same shape get_previews returns: preview shells + roadmap detail."""
    return [
        {"id": f"pv{i}-0", "title": f"Path {i}", "summary": "s", "weeks": 6,
         "outcomes": ["o1", "o2"],
         "roadmap": {"title": f"Path {i}", "weeks": [{"week": w, "topic": f"week {w}", "objectives": []} for w in range(1, 7)],
                     "outcome_statement": "Outcome"}}
        for i in range(3)
    ]


class PreviewPersistenceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email=USER, password=PASSWORD, fullName="Ada")
        self.other = User.objects.create_user(email=USER2, password=PASSWORD, fullName="Grace")
        self.fusion = Fusion.objects.create(
            id="fc-own", user=self.user, a="Design", b="Code",
            category_a="creative", category_b="tech")
        self.body = {"fusion": {"id": "fc-own", "a": "Design", "b": "Code"}, "salt": 0}

    def test_previews_persist_one_row_each_with_ids(self):
        self.client.force_authenticate(user=self.user)
        with patch("roadmaps.views.get_previews", return_value=_previews()):
            response = self.client.post("/api/roadmap/previews/", self.body, format="json")
        self.assertEqual(response.status_code, 200)
        previews = response.json()["previews"]
        self.assertEqual(len(previews), 3)
        roadmap_ids = [p["roadmap_id"] for p in previews]
        self.assertTrue(all(roadmap_ids))
        self.assertEqual(Roadmap.objects.count(), 3)
        rows = Roadmap.objects.order_by("id")
        for preview, row in zip(previews, rows):
            self.assertEqual(row.title, preview["title"])
            self.assertEqual(row.fusion_id, "fc-own")
            self.assertEqual(row.weeks_json[0]["week"], 1)
            self.assertFalse(row.chosen)
            self.assertFalse(row.locked)

    def test_same_titles_relinked_not_duplicated(self):
        self.client.force_authenticate(user=self.user)
        with patch("roadmaps.views.get_previews", return_value=_previews()):
            self.client.post("/api/roadmap/previews/", self.body, format="json")
            # same salt, same three titles reaching the backend again
            self.client.post("/api/roadmap/previews/", self.body, format="json")
        self.assertEqual(Roadmap.objects.count(), 3)

    def test_anon_undicated_fusion_persists_nothing(self):
        body = {"fusion": {"id": "fc-nonexistent", "a": "Design", "b": "Code"}, "salt": 0}
        with patch("roadmaps.views.get_previews", return_value=_previews()):
            response = self.client.post("/api/roadmap/previews/", body, format="json")
        self.assertEqual(response.status_code, 200)
        for p in response.json()["previews"]:
            self.assertNotIn("roadmap_id", p)
        self.assertEqual(Roadmap.objects.count(), 0)

    def test_previews_rejected_for_other_users_fusion(self):
        self.client.force_authenticate(user=self.other)
        with patch("roadmaps.views.get_previews", return_value=_previews()):
            response = self.client.post("/api/roadmap/previews/", self.body, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Roadmap.objects.count(), 0)

    def test_regenerate_advances_salt_and_persists(self):
        self.client.force_authenticate(user=self.user)
        with patch("roadmaps.views.get_previews", return_value=_previews()):
            response = self.client.post("/api/roadmap/regenerate/", self.body, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["salt"], 1)
        self.assertEqual(Roadmap.objects.count(), 3)


class ChooseAndTweakTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email=USER, password=PASSWORD, fullName="Ada")
        self.other = User.objects.create_user(email=USER2, password=PASSWORD, fullName="Grace")
        self.fusion = Fusion.objects.create(
            id="fc-own", user=self.user, a="Design", b="Code",
            category_a="creative", category_b="tech")
        self.roled = Roadmap.objects.create(fusion_id="fc-own", title="Path 0", weeks_json=[])
        self.second = Roadmap.objects.create(fusion_id="fc-own", title="Path 1", weeks_json=[])

    def test_choose_locks_row_rejecting_future_tweaks(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/roadmap/choose/", {"roadmap_id": self.roled.id}, format="json")
        self.assertEqual(response.json()["locked"], True)
        self.roled.refresh_from_db()
        self.assertTrue(self.roled.chosen and self.roled.locked)

        locked_response = self.client.post(
            "/api/roadmap/tweak/", {"roadmap_id": self.roled.id, "new_request": "more design"}, format="json")
        self.assertEqual(locked_response.status_code, 423)

    def test_choose_rejected_for_other_users_fusion(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.post("/api/roadmap/choose/", {"roadmap_id": self.roled.id}, format="json")
        self.assertEqual(response.status_code, 403)
        self.roled.refresh_from_db()
        self.assertFalse(self.roled.locked)

    def test_acceptable_tweak_accumulates_constraints(self):
        self.client.force_authenticate(user=self.user)
        self.second.constraints = ["Pre-existing note"]
        self.second.save(update_fields=["constraints"])
        with patch("roadmaps.views.tweak_roadmap", return_value={"classification": "acceptable"}) as mock:
            response = self.client.post(
                "/api/roadmap/tweak/",
                {"roadmap_id": self.second.id, "skill_a": "Design", "skill_b": "Code",
                 "new_request": "Week 2 in Figma"},
                format="json")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["classification"], "acceptable")
        self.assertIn("updated_constraints", result)
        self.assertIn("Week 2 in Figma", result["updated_constraints"])
        self.second.refresh_from_db()
        self.assertEqual(self.second.constraints,
                         ["Pre-existing note", "Week 2 in Figma"])
        args = mock.call_args
        self.assertEqual(args[0][1], ["Pre-existing note"])  # prior constraints passed through

    def test_locked_tweak_never_hits_sf(self):
        self.client.force_authenticate(user=self.user)
        self.roled.locked = True
        self.roled.save(update_fields=["locked"])
        with patch("roadmaps.views.tweak_roadmap") as mock:
            response = self.client.post(
                "/api/roadmap/tweak/", {"roadmap_id": self.roled.id, "new_request": "x"}, format="json")
        self.assertEqual(response.status_code, 423)
        mock.assert_not_called()

    def test_tweak_without_request_is_400(self):
        # no roadmap_id at all (an "" id breaks int conversion) skips ownership
        # and fails on the missing new_request
        response = self.client.post("/api/roadmap/tweak/",
                                    {"skill_a": "A", "skill_b": "B"},
                                    format="json")
        self.assertEqual(response.status_code, 400)


class GetPreviewsServiceTests(TestCase):
    """The 1+3 split: one call returns shells, three calls expand weeks."""

    def test_get_previews_performs_shell_then_expansions(self):
        shells = {"previews": [
            {"title": f"Path {i}", "summary": "s", "weeks": 2, "outcomes": ["o1", "o2"]}
            for i in range(3)
        ]}
        with patch("roadmaps.services.call_sf14b_json") as mock:
            mock.side_effect = [shells] + [
                {"title": f"Path {i}", "weeks": [{"week": 1, "topic": "t", "objectives": []},
                                                 {"week": 2, "topic": "t", "objectives": []}],
                 "outcome_statement": "Outcome"}
                for i in range(3)
            ]
            from .services import get_previews  # noqa: F401 (import inside test)
            previews = get_previews({"a": "Design", "b": "Code"}, salt=0)
        self.assertEqual(mock.call_count, 4)  # 1 shell + 3 expansions
        self.assertEqual(len(previews), 3)
        for p, i in zip(previews, range(3)):
            self.assertEqual(len(p["roadmap"]["weeks"]), 2)
            self.assertEqual(p["title"], f"Path {i}")


class ProgressAndRestoreTests(TestCase):
    """Week-progress persistence + chosen-roadmap restore after reload."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email=USER, password=PASSWORD, fullName="Ada")
        self.other = User.objects.create_user(email=USER2, password=PASSWORD, fullName="Grace")
        self.fusion = Fusion.objects.create(
            id="fc-own", user=self.user, a="Design", b="Code",
            category_a="creative", category_b="tech")
        self.rm = Roadmap.objects.create(
            fusion_id="fc-own", title="Path 0", chosen=True, locked=True,
            weeks_json=[{"week": 1, "topic": "a", "objectives": []},
                        {"week": 2, "topic": "b", "objectives": []}],
            outcome_statement="Outcome")

    def test_progress_advances_and_clamps_to_week_count(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/roadmap/progress/",
                                    {"roadmap_id": self.rm.id, "progress_weeks": 99},
                                    format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["progress_weeks"], 2)  # clamped
        self.rm.refresh_from_db()
        self.assertEqual(self.rm.progress_weeks, 2)

    def test_progress_never_regresses(self):
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/roadmap/progress/",
                         {"roadmap_id": self.rm.id, "progress_weeks": 2}, format="json")
        response = self.client.post("/api/roadmap/progress/",
                                    {"roadmap_id": self.rm.id, "progress_weeks": 1},
                                    format="json")
        self.assertEqual(response.json()["progress_weeks"], 2)

    def test_progress_rejected_for_other_users_fusion(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.post("/api/roadmap/progress/",
                                    {"roadmap_id": self.rm.id, "progress_weeks": 1},
                                    format="json")
        self.assertEqual(response.status_code, 403)

    def test_progress_without_id_is_400(self):
        response = self.client.post("/api/roadmap/progress/", {"progress_weeks": 1}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_chosen_restores_roadmap_with_progress(self):
        self.rm.progress_weeks = 1
        self.rm.save(update_fields=["progress_weeks"])
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/roadmap/chosen/", {"fusion_id": "fc-own"})
        self.assertEqual(response.status_code, 200)
        body = response.json()["roadmap"]
        self.assertEqual(body["roadmap_id"], self.rm.id)
        self.assertEqual(body["progress_weeks"], 1)
        self.assertEqual(len(body["weeks"]), 2)
        self.assertTrue(body["locked"])

    def test_chosen_returns_null_when_none_chosen(self):
        Roadmap.objects.filter(id=self.rm.id).update(chosen=False)
        response = self.client.get("/api/roadmap/chosen/", {"fusion_id": "fc-own"})
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["roadmap"])
