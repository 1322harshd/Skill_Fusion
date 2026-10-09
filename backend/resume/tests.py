from unittest.mock import MagicMock, patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import User
from growthlog.models import GrowthLogEntry

from .llm import LlmError, _extract_json_object, generate_resume_content
from .models import ResumeDocument

VALID_CONTENT = {
    "resumeSummary": "A builder who ships.",
    "resumeBullets": ["Shipped the Growth Log", "Connected GitHub OAuth"],
    "coverLetter": "Dear hiring team, ...",
}


def _mock_chat_response(content=None, reasoning="", finish_reason="stop", status_code=200):
    response = MagicMock(status_code=status_code)
    response.json.return_value = {
        "choices": [
            {
                "finish_reason": finish_reason,
                "message": {"content": content, "reasoning": reasoning},
            }
        ]
    }
    return response


class JsonExtractionTests(TestCase):
    def test_extracts_json_with_trailing_residue(self):
        text = '{"resumeSummary": "hi", "resumeBullets": [], "coverLetter": "x"}\n\nSome trailing thoughts here.'
        data = _extract_json_object(text)
        self.assertEqual(data["resumeSummary"], "hi")

    def test_extracts_json_with_leading_residue(self):
        text = 'Let me think about this.\n{"ok": true}'
        self.assertEqual(_extract_json_object(text), {"ok": True})

    def test_raises_when_no_json_present(self):
        with self.assertRaises(LlmError):
            _extract_json_object("no json here at all")

    def test_raises_on_unterminated_json(self):
        with self.assertRaises(LlmError):
            _extract_json_object('{"resumeSummary": "cut off mid')


class GenerateResumeContentTests(TestCase):
    @patch("resume.llm.requests.post")
    def test_parses_clean_content_field(self, post):
        import json

        post.return_value = _mock_chat_response(content=json.dumps(VALID_CONTENT))
        result = generate_resume_content("some prompt")
        self.assertEqual(result["resumeSummary"], VALID_CONTENT["resumeSummary"])

    @patch("resume.llm.requests.post")
    def test_parses_json_trailing_in_reasoning_field(self, post):
        import json

        # Simulates the documented quirk: content is empty, the JSON answer
        # landed in `reasoning` with extra thought text around it.
        post.return_value = _mock_chat_response(
            content=None,
            reasoning=f"Thinking...\n{json.dumps(VALID_CONTENT)}\nDone.",
        )
        result = generate_resume_content("some prompt")
        self.assertEqual(result["coverLetter"], VALID_CONTENT["coverLetter"])

    @patch("resume.llm.requests.post")
    def test_raises_when_truncated_before_answer(self, post):
        post.return_value = _mock_chat_response(content=None, reasoning="still thinking", finish_reason="length")
        with self.assertRaises(LlmError):
            generate_resume_content("some prompt")

    @patch("resume.llm.requests.post")
    def test_raises_on_non_200(self, post):
        post.return_value = _mock_chat_response(status_code=500)
        with self.assertRaises(LlmError):
            generate_resume_content("some prompt")

    @patch("resume.llm.requests.post")
    def test_raises_when_required_field_missing(self, post):
        import json

        post.return_value = _mock_chat_response(content=json.dumps({"resumeSummary": "only this"}))
        with self.assertRaises(LlmError):
            generate_resume_content("some prompt")


class GenerateResumeViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="ada@example.com", password="CorrectHorse1!", fullName="Ada")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        GrowthLogEntry.objects.create(
            user=self.user, title="Shipped a feature", description="Did a thing", verified=True
        )

    def test_requires_authentication(self):
        anon = APIClient()
        response = anon.post("/api/resume/generate", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("resume.views.generate_resume_content", return_value=VALID_CONTENT)
    def test_generates_and_persists_a_document(self, mocked):
        response = self.client.post("/api/resume/generate", {"jobListing": "Backend role"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertEqual(body["resumeSummary"], VALID_CONTENT["resumeSummary"])
        self.assertTrue(ResumeDocument.objects.filter(user=self.user, jobListing="Backend role").exists())

    @patch("resume.views.generate_resume_content", side_effect=LlmError("down"))
    def test_returns_502_when_llm_unavailable(self, mocked):
        response = self.client.post("/api/resume/generate", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(ResumeDocument.objects.count(), 0)


class ResumeExportViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="ada@example.com", password="CorrectHorse1!", fullName="Ada")
        self.other = User.objects.create_user(email="other@example.com", password="CorrectHorse1!", fullName="Other")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.document = ResumeDocument.objects.create(
            user=self.user,
            resumeSummary="Summary",
            resumeBullets=["One", "Two"],
            coverLetter="Dear team...",
        )

    def test_exports_resume_as_pdf(self):
        response = self.client.get(f"/api/resume/{self.document.documentId}/export?doc=resume")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF-"))

    def test_exports_cover_letter_as_pdf(self):
        response = self.client.get(f"/api/resume/{self.document.documentId}/export?doc=cover")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.content.startswith(b"%PDF-"))

    def test_cannot_export_someone_elses_document(self):
        other_client = APIClient()
        other_client.force_authenticate(user=self.other)
        response = other_client.get(f"/api/resume/{self.document.documentId}/export")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
