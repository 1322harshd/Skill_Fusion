from io import BytesIO
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from pypdf import PdfWriter
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import User
from growthlog.models import GrowthLogEntry

from .llm import LlmError, _extract_json_object, generate_resume_content
from .models import ResumeDocument, ResumeUpload
from .pdf import render_pdf
from .prompts import build_user_prompt


def _pdf_bytes_with_text(text):
    return render_pdf("Resume", [text])


def _blank_pdf_bytes():
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = BytesIO()
    writer.write(buf)
    return buf.getvalue()

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
        self.user = User.objects.create_user(email="ada@example.com", password="CorrectHorse1!", fullName="Ada", isEmailVerified=True)
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
        self.user = User.objects.create_user(email="ada@example.com", password="CorrectHorse1!", fullName="Ada", isEmailVerified=True)
        self.other = User.objects.create_user(email="other@example.com", password="CorrectHorse1!", fullName="Other", isEmailVerified=True)
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


class ResumeUploadViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="ada@example.com", password="CorrectHorse1!", fullName="Ada", isEmailVerified=True
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_requires_authentication(self):
        response = APIClient().post("/api/resume/upload", {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_returns_empty_when_nothing_uploaded(self):
        response = self.client.get("/api/resume/upload")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.json()["filename"])

    def test_uploads_a_txt_resume(self):
        upload = SimpleUploadedFile("resume.txt", b"Ada Lovelace - Backend Engineer", content_type="text/plain")
        response = self.client.post("/api/resume/upload", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["filename"], "resume.txt")

        stored = ResumeUpload.objects.get(user=self.user)
        self.assertIn("Backend Engineer", stored.extractedText)

    def test_uploads_a_pdf_resume(self):
        pdf_bytes = _pdf_bytes_with_text("Ada Lovelace - mathematician and programmer")
        upload = SimpleUploadedFile("resume.pdf", pdf_bytes, content_type="application/pdf")
        response = self.client.post("/api/resume/upload", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        stored = ResumeUpload.objects.get(user=self.user)
        self.assertIn("mathematician", stored.extractedText)

    def test_get_reflects_the_uploaded_file(self):
        upload = SimpleUploadedFile("resume.txt", b"some content", content_type="text/plain")
        self.client.post("/api/resume/upload", {"file": upload}, format="multipart")

        response = self.client.get("/api/resume/upload")
        self.assertEqual(response.json()["filename"], "resume.txt")
        self.assertNotIn("extractedText", response.json())

    def test_rejects_unsupported_file_type(self):
        upload = SimpleUploadedFile("resume.docx", b"not really a docx", content_type="application/msword")
        response = self.client.post("/api/resume/upload", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(ResumeUpload.objects.filter(user=self.user).exists())

    def test_rejects_a_pdf_with_no_extractable_text(self):
        upload = SimpleUploadedFile("resume.pdf", _blank_pdf_bytes(), content_type="application/pdf")
        response = self.client.post("/api/resume/upload", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reuploading_replaces_the_previous_file(self):
        first = SimpleUploadedFile("v1.txt", b"first version", content_type="text/plain")
        self.client.post("/api/resume/upload", {"file": first}, format="multipart")
        second = SimpleUploadedFile("v2.txt", b"second version", content_type="text/plain")
        self.client.post("/api/resume/upload", {"file": second}, format="multipart")

        self.assertEqual(ResumeUpload.objects.filter(user=self.user).count(), 1)
        stored = ResumeUpload.objects.get(user=self.user)
        self.assertEqual(stored.filename, "v2.txt")
        self.assertIn("second version", stored.extractedText)

    def test_delete_clears_the_upload(self):
        upload = SimpleUploadedFile("resume.txt", b"content", content_type="text/plain")
        self.client.post("/api/resume/upload", {"file": upload}, format="multipart")
        response = self.client.delete("/api/resume/upload")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ResumeUpload.objects.filter(user=self.user).exists())


class BuildUserPromptTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="ada@example.com", password="CorrectHorse1!", fullName="Ada", isEmailVerified=True
        )

    def test_includes_uploaded_resume_text_when_present(self):
        ResumeUpload.objects.create(user=self.user, filename="resume.txt", extractedText="Led the backend rewrite.")
        prompt = build_user_prompt(self.user, "")
        self.assertIn("Led the backend rewrite.", prompt)
        self.assertIn("resume the learner already has", prompt)

    def test_omits_the_section_when_no_upload_exists(self):
        prompt = build_user_prompt(self.user, "")
        self.assertNotIn("resume the learner already has", prompt)
