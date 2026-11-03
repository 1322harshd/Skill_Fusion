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
            project = make_project(["Design", "Code"])
        self.assertEqual(project["title"], "A flagship piece")
        prompt = mock.call_args[0][1]
        self.assertIn("Design", prompt)
        self.assertIn("Code", prompt)

    def test_make_project_is_labeled_deterministic_per_skills(self):
        # project brief comes straight from the LLM; the prompt names both
        # skills so distinct pairs never share a template by accident
        from .services import make_project
        with patch("projects.services.call_sf14b_json", return_value=JSON_PAYLOAD) as mock:
            make_project(["Woodworking", "History"])
            first_prompt = mock.call_args[0][1]
            mock.reset_mock()
            make_project(["Data Science", "Chemistry"])
            second_prompt = mock.call_args[0][1]
        self.assertIn("Woodworking", first_prompt)
        self.assertNotIn("Data Science", first_prompt)
        self.assertIn("Data Science", second_prompt)
        self.assertNotIn("Woodworking", second_prompt)

    def test_make_project_trio_prompt_names_all_three(self):
        from .services import make_project
        with patch("projects.services.call_sf14b_json", return_value=JSON_PAYLOAD) as mock:
            make_project(["Woodworking", "History", "AI"])
        prompt = mock.call_args[0][1]
        for skill in ("Woodworking", "History", "AI"):
            self.assertIn(skill, prompt)
        self.assertIn("all of them", prompt)


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

    def test_docx_attachment_text_is_extracted(self):
        import io, zipfile
        from django.core.files.uploadedfile import SimpleUploadedFile
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("word/document.xml",
                       '<w:document xmlns:w="http://w"><w:body><w:p><w:r><w:t>'
                       "Deployed the dashboard and measured latency.</w:t></w:r></w:p>"
                       "</w:body></w:document>")
        with patch("projects.services.call_sf14b_json", return_value=VERDICT_PAYLOAD):
            response = self.client.post("/api/projects/submit", {
                "fusion_id": "f-demo", "explanation": "docx work",
                "file": SimpleUploadedFile("work.docx", buf.getvalue(), content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            }, format="multipart")
        self.assertEqual(response.status_code, 201)
        from projects.models import ProjectSubmission
        self.assertIn("dashboard", ProjectSubmission.objects.latest("id").file_text)

    def test_image_attachment_kept_as_visual_proof(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        with patch("projects.services.call_sf14b_json", return_value=VERDICT_PAYLOAD):
            response = self.client.post("/api/projects/submit", {
                "fusion_id": "f-demo", "explanation": "screenshot proof attached",
                "file": SimpleUploadedFile("proof.png", b"\x89PNG pretend", content_type="image/png"),
            }, format="multipart")
        self.assertEqual(response.status_code, 201)
        sub = response.json()["submission"]
        self.assertEqual(sub["filename"], "proof.png")
        self.assertIn("Image attached as proof", sub["attachmentNote"])

    def test_oversized_attachment_rejected(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        response = self.client.post("/api/projects/submit", {
            "fusion_id": "f-demo", "explanation": "big",
            "file": SimpleUploadedFile("big.zip", b"x" * (10 * 1024 * 1024 + 1), content_type="application/zip"),
        }, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn("10MB", response.json()["error"])

    def test_link_only_submission_assesses_without_artifact_text(self):
        with patch("projects.services.call_sf14b_json", return_value=VERDICT_PAYLOAD):
            response = self.client.post("/api/projects/submit", {
                "fusion_id": "f-demo", "explanation": "see repo",
                "source_link": "https://github.com/me/lumina",
            }, format="multipart")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["submission"]["sourceLink"], "https://github.com/me/lumina")

    def _submit_file(self, name, content):
        from django.core.files.uploadedfile import SimpleUploadedFile
        with patch("projects.services.call_sf14b_json", return_value=VERDICT_PAYLOAD):
            return self.client.post("/api/projects/submit", {
                "fusion_id": "f-demo", "explanation": "readable artifact",
                "file": SimpleUploadedFile(name, content, content_type="application/octet-stream"),
            }, format="multipart")

    def test_markdown_py_csv_json_submissions_are_read_not_rejected(self):
        """The 19 advertised-but-secretly-rejected extensions now actually read:
        a .md/.py/.csv submission must reach the grader, not bounce with a
        resume-flavored 'upload .pdf or .txt' error."""
        from projects.models import ProjectSubmission
        samples = [
            ("writeup.md", "# Lumina\n\nWe measured a 40% latency drop."),
            ("extract.py", "def extract(text):\n    return text.strip()"),
            ("results.csv", "run,latency_ms\n1,420\n2,410"),
            ("package.json", '{"name": "lumina", "version": "0.1.0"}'),
        ]
        for name, content in samples:
            with self.subTest(ext=name.rsplit(".", 1)[-1]):
                response = self._submit_file(name, content.encode("utf-8"))
                self.assertEqual(response.status_code, 201, response.json())
                self.assertIn(content.strip().splitlines()[0],
                              ProjectSubmission.objects.latest("id").file_text)

    def test_empty_readable_file_rejected_with_message(self):
        response = self._submit_file("empty.md", b"   \n")
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json()["error"].lower())

    def test_10mb_text_file_accepted_at_submit_cap(self):
        """The read cap matches the submit cap (the old 5MB resume cap used to
        reject text files the view advertised as fine)."""
        from projects.models import ProjectSubmission
        payload = ("Week of work — " * 400000).encode("utf-8")[: 9 * 1024 * 1024]  # 9MB text
        response = self._submit_file("diary.txt", payload)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(ProjectSubmission.objects.latest("id").file_text), 20_000)

    def test_unreadable_pdf_rejected_with_project_message(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        response = self.client.post("/api/projects/submit", {
            "fusion_id": "f-demo", "explanation": "broken pdf",
            "file": SimpleUploadedFile("broken.pdf", b"%PDF-1.4 not really a pdf", content_type="application/pdf"),
        }, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("resume", response.json()["error"].lower())

    def test_sf_failure_fails_open_with_saved_submission(self):
        with patch("projects.services.call_sf14b_json", side_effect=RuntimeError("down")):
            response = self.client.post("/api/projects/submit", {
                "fusion_id": "f-demo", "file": self._txt_file(),
            }, format="multipart")
        self.assertEqual(response.status_code, 201)
        verdict = response.json()["submission"]["verdict"]
        self.assertIsNone(verdict["matchScore"])
        self.assertIn("couldn't run", verdict["verdict"].lower())
