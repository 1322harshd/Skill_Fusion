from unittest.mock import patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import User
from growthlog.models import GrowthLogEntry

from .models import PostDraft


class GeneratePostViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="ada@example.com", password="CorrectHorse1!", fullName="Ada", isEmailVerified=True)
        self.other = User.objects.create_user(email="other@example.com", password="CorrectHorse1!", fullName="Other", isEmailVerified=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.entry = GrowthLogEntry.objects.create(
            user=self.user, title="Shipped the Growth Log", description="Real evidence, logged.", verified=True
        )

    def test_requires_authentication(self):
        anon = APIClient()
        response = anon.post("/api/posts/generate", {"entryId": str(self.entry.entryId)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_generate_from_someone_elses_entry(self):
        other_client = APIClient()
        other_client.force_authenticate(user=self.other)
        response = other_client.post("/api/posts/generate", {"entryId": str(self.entry.entryId)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("posts.views.generate_post_text", return_value="Shipped the Growth Log — real evidence, logged.")
    def test_generates_and_persists_a_draft(self, mocked):
        response = self.client.post(
            "/api/posts/generate", {"entryId": str(self.entry.entryId), "tone": "Punchy"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertEqual(body["tone"], "Punchy")
        self.assertEqual(body["status"], "draft")
        self.assertTrue(PostDraft.objects.filter(entry=self.entry, user=self.user).exists())

    @patch("posts.views.generate_post_text", return_value="first draft")
    def test_redrafting_replaces_the_existing_draft_not_duplicates(self, mocked):
        self.client.post("/api/posts/generate", {"entryId": str(self.entry.entryId)}, format="json")
        mocked.return_value = "second draft"
        self.client.post("/api/posts/generate", {"entryId": str(self.entry.entryId)}, format="json")

        drafts = PostDraft.objects.filter(entry=self.entry, user=self.user, status="draft")
        self.assertEqual(drafts.count(), 1)
        self.assertEqual(drafts.first().text, "second draft")

    @patch("posts.views.generate_post_text", side_effect=ValueError("SF returned an empty post."))
    def test_returns_502_when_generation_fails(self, mocked):
        response = self.client.post("/api/posts/generate", {"entryId": str(self.entry.entryId)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertFalse(PostDraft.objects.filter(entry=self.entry).exists())

    def test_rejects_unknown_entry(self):
        response = self.client.post(
            "/api/posts/generate",
            {"entryId": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PostDraftListAndUpdateTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="ada@example.com", password="CorrectHorse1!", fullName="Ada", isEmailVerified=True)
        self.other = User.objects.create_user(email="other@example.com", password="CorrectHorse1!", fullName="Other", isEmailVerified=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.entry = GrowthLogEntry.objects.create(user=self.user, title="Shipped the Growth Log")
        self.draft = PostDraft.objects.create(user=self.user, entry=self.entry, text="Draft text")

    def test_lists_only_the_users_own_drafts(self):
        PostDraft.objects.create(user=self.other, entry=self.entry, text="Not yours")
        response = self.client.get("/api/posts/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [d["postId"] for d in response.json()]
        self.assertEqual(ids, [str(self.draft.postId)])

    def test_can_update_status_and_text(self):
        response = self.client.patch(
            f"/api/posts/{self.draft.postId}", {"status": "shared", "text": "Edited text"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, "shared")
        self.assertEqual(self.draft.text, "Edited text")

    def test_cannot_update_someone_elses_draft(self):
        other_client = APIClient()
        other_client.force_authenticate(user=self.other)
        response = other_client.patch(f"/api/posts/{self.draft.postId}", {"status": "shared"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
