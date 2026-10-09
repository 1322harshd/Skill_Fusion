from unittest.mock import MagicMock, patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import User

from .github_import import import_github_entries
from .models import GrowthLogEntry


class GrowthLogOwnershipTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email="owner@example.com", password="CorrectHorse1!", fullName="Owner")
        self.other = User.objects.create_user(email="other@example.com", password="CorrectHorse1!", fullName="Other")
        self.entry = GrowthLogEntry.objects.create(user=self.owner, title="Owner's entry")

    def test_users_only_see_their_own_entries(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.get("/api/growth-log/entries")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [e["title"] for e in response.json()]
        self.assertNotIn("Owner's entry", titles)

    def test_users_cannot_open_someone_elses_entry(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.get(f"/api/growth-log/entries/{self.entry.entryId}")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_users_cannot_delete_someone_elses_entry(self):
        self.client.force_authenticate(user=self.other)
        self.client.delete(f"/api/growth-log/entries/{self.entry.entryId}")
        self.assertTrue(GrowthLogEntry.objects.filter(pk=self.entry.pk).exists())

    def test_create_entry_is_manual_and_owned_by_requester(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.post(
            "/api/growth-log/entries", {"title": "Wrote tests", "description": ""}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        entry = GrowthLogEntry.objects.get(title="Wrote tests")
        self.assertEqual(entry.user, self.other)
        self.assertEqual(entry.source, GrowthLogEntry.Source.MANUAL)


class GithubImportTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="ada@example.com", password="CorrectHorse1!", fullName="Ada")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_import_requires_connected_github(self):
        response = self.client.post("/api/growth-log/github-import")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_import_without_token_creates_nothing(self):
        self.user.githubUrl = "https://github.com/ada"  # legacy URL, no token
        self.user.save()
        with patch("growthlog.github_import.requests.get") as get:
            created = import_github_entries(self.user)
        self.assertEqual(created, [])
        get.assert_not_called()

    def test_import_skips_forks_and_marks_private_repos(self):
        self.user.githubAccessToken = "gho_token"
        self.user.save()
        repos = [
            {"name": "private-app", "html_url": "https://github.com/ada/private-app", "private": True,
             "fork": False, "description": "secret", "language": "Python"},
            {"name": "forked-lib", "html_url": "https://github.com/ada/forked-lib", "private": False,
             "fork": True, "description": "", "language": None},
            {"name": "public-site", "html_url": "https://github.com/ada/public-site", "private": False,
             "fork": False, "description": "portfolio", "language": "JavaScript"},
        ]
        response = MagicMock(status_code=200)
        response.json.return_value = repos

        with patch("growthlog.github_import.requests.get", return_value=response):
            created = import_github_entries(self.user)

        self.assertEqual(len(created), 2)
        names = {e.title: e for e in created}
        self.assertTrue(names["private-app"].isPrivate)
        self.assertFalse(names["public-site"].isPrivate)
        self.assertNotIn("forked-lib", names)

    def test_import_is_idempotent(self):
        self.user.githubAccessToken = "gho_token"
        self.user.save()
        repo = {"name": "site", "html_url": "https://github.com/ada/site", "private": False,
                "fork": False, "description": "", "language": None}
        response = MagicMock(status_code=200)
        response.json.return_value = [repo]

        with patch("growthlog.github_import.requests.get", return_value=response):
            first = import_github_entries(self.user)
            second = import_github_entries(self.user)

        self.assertEqual(len(first), 1)
        self.assertEqual(second, [])


class VerifyCredentialTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="ada@example.com", password="CorrectHorse1!", fullName="Ada")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.entry = GrowthLogEntry.objects.create(user=self.user, title="A certificate")

    def test_oversized_url_is_rejected_cleanly_not_a_500(self):
        # Regression: VerifyCredentialSerializer didn't cap length to match the
        # Credential model's max_length=200, so an oversized value passed
        # validation and crashed at the DB insert (DataError -> 500) instead of
        # failing serializer validation (-> 400).
        long_url = "https://example.com/cert?token=" + ("a" * 250)
        response = self.client.post(
            f"/api/growth-log/entries/{self.entry.entryId}/verify-credential",
            {"verificationUrl": long_url},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_issuer_is_rejected_cleanly_not_a_500(self):
        response = self.client.post(
            f"/api/growth-log/entries/{self.entry.entryId}/verify-credential",
            {"verificationUrl": "https://example.com/cert", "issuer": "x" * 250},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("growthlog.verification.requests.get")
    def test_normal_length_values_are_accepted(self, get):
        get.return_value = MagicMock(status_code=200, text="credential confirmed for ada")
        response = self.client.post(
            f"/api/growth-log/entries/{self.entry.entryId}/verify-credential",
            {"verificationUrl": "https://example.com/cert", "issuer": "Amazon Web Services"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ContributionsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_contributions_requires_github_url(self):
        user = User.objects.create_user(email="nogh@example.com", password="CorrectHorse1!", fullName="No GH")
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/growth-log/github-contributions")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
