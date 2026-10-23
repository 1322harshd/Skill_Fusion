"""Tests for the explain app: SF milestone/week feedback with labeled fallback."""
from django.test import TestCase
from unittest.mock import patch

JSON_FEDBACK = '{"clarity": "Clear", "note": "You connected them", "suggestion": "Add an example"}'


class ExplainFeedbackTests(TestCase):
    @property
    def _client(self):
        from rest_framework.test import APIClient
        return APIClient()

    def test_week_prompt_used_by_default(self):
        from .prompts import week_prompt
        text = week_prompt("Design", "Code", "my sentence")
        self.assertIn("Design", text)
        self.assertIn("Code", text)

    def test_milestone_prompt_differs_from_week(self):
        from .prompts import week_prompt, milestone_prompt
        self.assertNotEqual(week_prompt("A", "B", "text"), milestone_prompt("A", "B", "text"))

    def test_sf_parse_happy_path(self):
        from .services import explain_feedback
        import asyncio
        with patch("explain.services.call_sf14b", return_value=JSON_FEDBACK):
            result = asyncio.run(explain_feedback("Design", "Code", "one-liner", "week"))
        self.assertEqual(result["clarity"], "Clear")
        self.assertEqual(result["note"], "You connected them")

    def test_fallback_is_deterministic_and_matches_helper(self):
        from .services import explain_feedback, fallback
        import asyncio
        with patch("explain.services.call_sf14b", side_effect=RuntimeError("SF down")):
            result = asyncio.run(explain_feedback("A", "B", "text", "week"))
        self.assertEqual(result, fallback("A", "B", "text"))
        self.assertEqual(set(result), {"clarity", "note", "suggestion"})
        self.assertTrue(result["clarity"])
        self.assertTrue(result["note"])
        self.assertTrue(result["suggestion"])

    def test_view_returns_200_with_fallback_when_sf_unreachable(self):
        with patch("explain.services.call_sf14b", side_effect=RuntimeError("SF down")):
            response = self._client.post("/api/explain/",
                                         {"a": "A", "b": "B", "text": "text"}, format="json")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(set(body), {"clarity", "note", "suggestion"})
        self.assertTrue(body["note"])
        self.assertTrue(body["suggestion"])
