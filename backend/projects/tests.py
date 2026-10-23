"""Tests for the projects app: flagship project brief generation."""
from unittest.mock import patch

from django.test import TestCase

JSON_PAYLOAD = {
    "title": "A flagship piece", "fusion_pair": ["Design", "Code"],
    "key_deliverables": ["Working artifact", "Write-up", "Link"],
    "expected_outcome": "Hireable work",
}


class ProjectShapeTests(TestCase):
    def test_make_project_asks_sf_and_returns_object(self):
        from .services import make_project
        with patch("projects.services.call_sf14b_json", return_value=JSON_PAYLOAD) as mock:
            project = make_project("Design", "Code")
        self.assertEqual(project["title"], "A flagship piece")
        prompt = mock.call_args[0][1]
        self.assertIn("Design", prompt)
        self.assertIn("Code", prompt)

    def test_make_project_is_labeled_deterministic_per_skills(self):
        # project brief comes straight from the LLM; the prompt names both
        # skills so distinct pairs never share a template by accident
        from .services import make_project
        with patch("projects.services.call_sf14b_json", return_value=JSON_PAYLOAD) as mock:
            make_project("Woodworking", "History")
            first_prompt = mock.call_args[0][1]
            mock.reset_mock()
            make_project("Data Science", "Chemistry")
            second_prompt = mock.call_args[0][1]
        self.assertIn("Woodworking", first_prompt)
        self.assertNotIn("Data Science", first_prompt)
        self.assertIn("Data Science", second_prompt)
        self.assertNotIn("Woodworking", second_prompt)
