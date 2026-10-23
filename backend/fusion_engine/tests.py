"""Tests for the fusion_engine app: fuse persistence + history + ownership,
quiz sessions with server-side answer keys, and category mapping parity."""
import json
import json as _json
from unittest.mock import patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import Fusion, QuizSession
from authentication.models import User

PASSWORD = "CorrectHorse1!"
USER = "ada@example.com"
USER2 = "grace@example.com"


# ---- helpers -------------------------------------------------------------

def _sf_brief():
    return {"lede": "e" * 30, "complementarity": ["x" * 20, "y" * 20],
            "applications": ["x" * 20, "y" * 20, "z" * 20],
            "industries": ["a", "b", "c"], "insights": ["x" * 20, "y" * 20]}


def _sf_project():
    return {"title": "Flagship", "client": "Hiring managers", "timeline": "4 weeks",
            "format": "Portfolio artifact", "audience": "Teams", "goal": "Prove the blend",
            "tools": ["Notion"], "deliverables": ["Artifact"], "expectedOutcome": "Hirable"}


def _mock_sf():
    """Patch the SF dependencies of fuse_view. Only make_brief (bound in the
    views module) and make_project (dynamically imported) need mocks — the
    score path runs its deterministic heuristic when no listings exist."""
    import contextlib
    s = contextlib.ExitStack()
    s.enter_context(patch("fusion_engine.views.make_brief", return_value=_sf_brief()))
    s.enter_context(patch("projects.services.make_project", return_value=_sf_project()))
    return s


# ---- categories ----------------------------------------------------------

class CategoryParityTests(TestCase):
    def test_domain_listed_skills_map_first(self):
        from .categories import category_of
        self.assertEqual(category_of("Python"), "tech")
        self.assertEqual(category_of("Marketing"), "business")

    def test_hash_fallback_matches_frontend_bit_for_bit(self):
        # JS pipeline: (h*31+c) | 0 per char then Math.abs; server must match
        # or restored fusions land in the wrong category bucket.
        from .categories import category_of as backend, hash as backend_hash
        self.assertEqual(backend("Woodworking"), "tech")
        self.assertEqual(backend("Cooking"), "creative")
        self.assertEqual(backend_hash("History"), 1703379852)
        self.assertEqual(backend_hash("Woodworking×History"), 502937727)


# ---- fuse + history ------------------------------------------------------

class FuseTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email=USER, password=PASSWORD, fullName="Ada")
        self.payload = {"a": "Design", "b": "Code"}

    def test_anon_fuse_returns_fusion_without_persisting(self):
        with _mock_sf():
            response = self.client.post("/api/fusion/", self.payload, format="json")
        self.assertEqual(response.status_code, 200)
        body = response.json()["fusion"]
        for key in ("id", "a", "b", "score", "brief", "project"):
            self.assertIn(key, body)
        self.assertFalse(Fusion.objects.exists())

    def test_authed_fuse_persists_row_with_categories(self):
        self.client.force_authenticate(user=self.user)
        with _mock_sf():
            response = self.client.post("/api/fusion/", self.payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Fusion.objects.count(), 1)
        row = Fusion.objects.get()
        self.assertEqual(row.user, self.user)
        self.assertEqual(row.a, "Design")
        self.assertEqual(row.category_a, "creative")
        self.assertEqual(row.category_b, "tech")
        self.assertEqual(row.brief["lede"], "e" * 30)
        # id is namespaced per user so pair collisions can't happen
        self.assertTrue(row.id.startswith("f") and row.id.endswith(f"u{self.user.pk}"))

    def test_refuse_same_pair_replaces_row(self):
        # fusion ids are keyed by a×b in request order, so re-fusing the same
        # ordered pair must update the row instead of duplicating it
        self.client.force_authenticate(user=self.user)
        with _mock_sf():
            self.client.post("/api/fusion/", self.payload, format="json")
            self.client.post("/api/fusion/", {"a": "Design", "b": "Code"}, format="json")
        self.assertEqual(Fusion.objects.count(), 1)

    def test_two_users_same_pair_get_two_rows(self):
        other = User.objects.create_user(email=USER2, password=PASSWORD, fullName="Grace")
        self.client.force_authenticate(user=self.user)
        with _mock_sf():
            self.client.post("/api/fusion/", self.payload, format="json")
        self.client.force_authenticate(user=other)
        with _mock_sf():
            self.client.post("/api/fusion/", self.payload, format="json")
        self.assertEqual(Fusion.objects.count(), 2)

    def test_missing_args_is_400(self):
        response = self.client.post("/api/fusion/", {"a": "Design"}, format="json")
        self.assertEqual(response.status_code, 400)


class FusionHistoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email=USER, password=PASSWORD, fullName="Ada")
        self.other = User.objects.create_user(email=USER2, password=PASSWORD, fullName="Grace")

    def test_requires_employee_authentication(self):
        response = self.client.get("/api/fusion/history/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_history_returns_only_own_rows(self):
        Fusion.objects.create(id="fx-other", user=self.other, a="X", b="Y",
                              category_a="tech", category_b="comm")
        Fusion.objects.create(id="fx-mine", user=self.user, a="A", b="B",
                              category_a="creative", category_b="tech")
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/fusion/history/")
        self.assertEqual(response.status_code, 200)
        ids = [f["id"] for f in response.json()["fusions"]]
        self.assertEqual(ids, ["fx-mine"])


# ---- quiz ----------------------------------------------------------------
# _gen_skill slices [:count] per difficulty split (2 hard, 2 medium, 1 easy)
# from each SF call, so the mock must return questions matching the diff the
# prompt asked for.

import re


def _fake_quiz_call(adapter, prompt):
    m = re.search(r"Write (\d+) (\w+) multiple-choice", prompt)
    diff = m.group(2)
    return {"questions": [
        {"q": f"{diff} question {i}", "options": ["a", "b", "c", "d"],
         "answer_index": i % 4, "difficulty": diff}
        for i in range(5)
    ]}


class QuizSessionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email=USER, password=PASSWORD, fullName="Ada")

    def _generate(self, skills=None, auth=False):
        if auth:
            self.client.force_authenticate(user=self.user)
        with patch("prompt_engineering.llm_client.call_sf14b_json",
                   side_effect=_fake_quiz_call):
            return self.client.post("/api/fusion/quiz/generate/",
                                    {"skills": skills or ["Python"]}, format="json")

    def _answer_all(self, session, correct):
        return [{"id": q["id"],
                 "choice": q["answer"] if correct else (q["answer"] + 1) % 4}
                for q in session.questions]

    def test_generate_strips_answers_stores_keys_server_side(self):
        response = self._generate()
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body["questions"]), 5)
        self.assertEqual({q["difficulty"] for q in body["questions"]},
                         {"easy", "medium", "hard"})
        for q in body["questions"]:
            self.assertNotIn("answer", q)
            self.assertNotIn("answer_index", q)
        session = QuizSession.objects.get(id=body["session_id"])
        # keys stay server-side
        self.assertTrue(all("answer" in q for q in session.questions))

    def test_generate_binds_user_when_authenticated(self):
        response = self._generate(auth=True)
        self.assertEqual(QuizSession.objects.get(id=response.json()["session_id"]).user,
                         self.user)

    def test_score_quiz_counts_correct_answers_and_saves_levels(self):
        gen = self._generate().json()
        session = QuizSession.objects.get(id=gen["session_id"])
        response = self.client.post("/api/fusion/quiz/submit/",
                                    {"session_id": gen["session_id"],
                                     "answers": self._answer_all(session, True)},
                                    format="json")
        self.assertEqual(response.status_code, 200)
        levels = response.json()["levels"]
        self.assertEqual(len(levels), 1)
        self.assertEqual(levels[0]["level"], 10)  # 5 correct × 2 marks
        self.assertEqual(levels[0]["label"], "Python")
        self.assertIn("5/5", levels[0]["reason"])
        session.refresh_from_db()
        self.assertEqual(len(session.levels), 1)
        self.assertEqual(len(session.answers), 5)

    def test_score_quiz_wrong_answers_floored_at_level_1(self):
        gen = self._generate().json()
        session = QuizSession.objects.get(id=gen["session_id"])
        response = self.client.post("/api/fusion/quiz/submit/",
                                    {"session_id": gen["session_id"],
                                     "answers": self._answer_all(session, False)},
                                    format="json")
        self.assertEqual(response.json()["levels"][0]["level"], 1)

    def test_two_skills_get_two_level_rows(self):
        gen = self._generate(["Python", "SQL"]).json()
        session = QuizSession.objects.get(id=gen["session_id"])
        response = self.client.post("/api/fusion/quiz/submit/",
                                    {"session_id": gen["session_id"],
                                     "answers": self._answer_all(session, True)},
                                    format="json")
        levels = response.json()["levels"]
        self.assertEqual({lv["label"] for lv in levels}, {"Python", "SQL"})
        self.assertEqual(len(session.questions), 10)


# ---- prompt_engineering (structured-output validation used by all apps) ----

class LLMClientRepairTests(TestCase):
    def test_parse_sf_json_first_object_extraction(self):
        from prompt_engineering.llm_client import parse_sf_json
        obj, _ = parse_sf_json("Some preamble text {\"a\": 1, \"b\": [\"x\"]} trailing")
        self.assertEqual(obj, {"a": 1, "b": ["x"]})

    def test_parse_sf_json_tolerates_trailing_commas(self):
        from prompt_engineering.llm_client import parse_sf_json
        obj, _ = parse_sf_json("{\"a\": [1, 2,],}")
        self.assertEqual(obj, {"a": [1, 2]})

    def test_parser_accepts_literal_control_characters(self):
        value = "{\n\"a\": \"line1\nline2\"\n}"
        from prompt_engineering.llm_client import parse_sf_json
        try:
            obj, _ = parse_sf_json(value)
            self.assertEqual(obj["a"].split(), ["line1", "line2"])
        except _json.JSONDecodeError:
            self.fail("control-character tolerance is a documented contract — it broke")

    def test_parse_sf_json_raises_when_no_object(self):
        from prompt_engineering.llm_client import parse_sf_json
        with self.assertRaises(json.JSONDecodeError):
            parse_sf_json("no json anywhere in here")


class EvidenceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="engineer@example.com", password="CorrectHorse1!", fullName="Ada")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _upload(self, text):
        from resume.models import ResumeUpload
        ResumeUpload.objects.create(user=self.user, filename="cv.md", extractedText=text)

    def _sf_verdict(self):
        return {
            "skills": [
                {"skill": "Engineering", "known": True, "level": 8, "reason": "\"Senior Software Engineer\""},
                {"skill": "Growth", "known": False, "level": None, "reason": ""},
            ]
        }

    def test_no_resume_marks_everything_unknown(self):
        from .evidence import judge_skills_from_resume
        out = judge_skills_from_resume(self.user, ["Engineering", "Growth"])
        self.assertEqual([v["known"] for v in out], [False, False])

    def test_sf_verdict_normalizes_levels_and_flags(self):
        self._upload("Senior Software Engineer. Built dashboards.")
        with patch("prompt_engineering.llm_client.call_sf14b_json") as mock:
            mock.return_value = self._sf_verdict()
            out = evidence_mod().judge_skills_from_resume(self.user, ["Engineering", "Growth"])
        self.assertEqual(out[0]["known"], True)
        self.assertEqual(out[0]["level"], 8)
        self.assertEqual(out[0]["source"], "resume")
        self.assertEqual(out[1]["known"], False)
        self.assertEqual(out[1]["level"], None)

    def test_level_clamped_to_scale(self):
        self._upload("x" * 200)
        data = {"skills": [{"skill": "Engineering", "known": True, "level": 42, "reason": "r"}]}
        with patch("prompt_engineering.llm_client.call_sf14b_json") as mock:
            mock.return_value = data
            out = evidence_mod().judge_skills_from_resume(self.user, ["Engineering"])
        self.assertEqual(out[0]["level"], 10)

    def test_broken_sf_output_falls_open_to_quiz(self):
        self._upload("x" * 200)
        with patch("prompt_engineering.llm_client.call_sf14b_json") as mock:
            mock.side_effect = RuntimeError("SF down")
            out = evidence_mod().judge_skills_from_resume(self.user, ["Engineering", "Growth"])
        self.assertEqual([v["known"] for v in out], [False, False])
        self.assertIn("quiz", out[0]["reason"].lower())

    def test_skills_known_endpoint_requires_auth(self):
        anon = APIClient()
        response = anon.post("/api/fusion/skills/known/", {"skills": ["Engineering", "Growth"]}, format="json")
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_skills_known_endpoint_returns_verdicts_in_order(self):
        self._upload("x" * 200)
        with patch("prompt_engineering.llm_client.call_sf14b_json") as mock:
            mock.return_value = self._sf_verdict()
            response = self.client.post("/api/fusion/skills/known/", {"skills": ["Engineering", "Growth"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        verdicts = response.json()["verdicts"]
        self.assertEqual([v["label"] for v in verdicts], ["Engineering", "Growth"])


def evidence_mod():
    """Late import so views' module-level binding isn't affected."""
    from . import evidence as _e
    return _e
