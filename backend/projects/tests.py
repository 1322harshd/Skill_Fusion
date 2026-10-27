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


# ---- milestone submission --------------------------------------------------
VERDICT_PAYLOAD = {
    "matchScore": 72, "closeness": "partial",
    "strengths": ["Interactive interface works", "SVG illustrations reusable"],
    "gaps": ["No write-up", "Second skill underused"],
    "verdict": "Solid partial delivery.",
}


class SubmitWorkTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()

    def _txt_file(self, name="work.txt", content="Built the interactive engine."):
        from django.core.files.uploadedfile import SimpleUploadedFile
        return SimpleUploadedFile(name, content.encode(), content_type="text/plain")

    def test_submit_with_file_persists_and_returns_verdict(self):
        with patch("projects.services.call_sf14b_json", return_value=VERDICT_PAYLOAD):
            response = self.client.post("/api/projects/submit", {
                "fusion_id": "f-demo", "explanation": "I built it",
                "brief": '{"title": "Lumina"}', "file": self._txt_file(),
            }, format="multipart")
        self.assertEqual(response.status_code, 201)
        sub = response.json()["submission"]
        self.assertEqual(sub["verdict"]["matchScore"], 72)
        self.assertEqual(sub["verdict"]["closeness"], "partial")
        self.assertEqual(sub["filename"], "work.txt")

    def test_submit_requires_file_or_link(self):
        response = self.client.post("/api/projects/submit",
                                    {"fusion_id": "f-demo", "explanation": "x"},
                                    format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_bad_file_extension_rejected_with_message(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        response = self.client.post("/api/projects/submit", {
            "fusion_id": "f-demo", "file": SimpleUploadedFile("a.bin", b"\x00\x01", content_type="application/octet-stream"),
        }, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn(".pdf", response.json()["error"])

    def test_link_only_submission_assesses_without_artifact_text(self):
        with patch("projects.services.call_sf14b_json", return_value=VERDICT_PAYLOAD):
            response = self.client.post("/api/projects/submit", {
                "fusion_id": "f-demo", "explanation": "see repo",
                "source_link": "https://github.com/me/lumina",
            }, format="multipart")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["submission"]["sourceLink"], "https://github.com/me/lumina")

    def test_sf_failure_fails_open_with_saved_submission(self):
        with patch("projects.services.call_sf14b_json", side_effect=RuntimeError("down")):
            response = self.client.post("/api/projects/submit", {
                "fusion_id": "f-demo", "file": self._txt_file(),
            }, format="multipart")
        self.assertEqual(response.status_code, 201)
        verdict = response.json()["submission"]["verdict"]
        self.assertIsNone(verdict["matchScore"])
        self.assertIn("couldn't run", verdict["verdict"].lower())
