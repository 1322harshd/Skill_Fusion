from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from .models import User

PASSWORD = "CorrectHorse1!"


class AuthTests(TestCase):
    def setUp(self):
        cache.clear()  # login is rate-limited; keep tests independent
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="ada@example.com", password=PASSWORD, fullName="Ada Lovelace"
        )

    def test_register_creates_user_and_returns_access_token(self):
        response = self.client.post(
            "/api/auth/register",
            {"email": "new@example.com", "password": PASSWORD, "name": "New User"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("accessToken", response.json())
        self.assertTrue(User.objects.filter(email="new@example.com").exists())

    def test_login_returns_access_token(self):
        response = self.client.post(
            "/api/auth/login", {"email": "ada@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("accessToken", response.json())

    def test_login_rejects_wrong_password(self):
        response = self.client.post(
            "/api/auth/login", {"email": "ada@example.com", "password": "wrong-password-1"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_requires_authentication(self):
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_never_exposes_github_access_token(self):
        self.user.githubAccessToken = "gho_supersecrettoken"
        self.user.githubUrl = "https://github.com/ada"
        self.user.save()
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()["user"]
        self.assertTrue(body["githubConnected"])
        self.assertNotIn("githubAccessToken", body)
        self.assertNotIn("gho_supersecrettoken", response.content.decode())

    def test_me_reports_not_connected_without_token(self):
        self.user.githubUrl = "https://github.com/ada"  # legacy URL, no OAuth token
        self.user.save()
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/auth/me")

        self.assertFalse(response.json()["user"]["githubConnected"])

    def test_github_url_cannot_be_set_through_profile_patch(self):
        self.client.force_authenticate(user=self.user)
        self.client.patch("/api/auth/me", {"githubUrl": "https://github.com/someone-else"}, format="json")
        self.user.refresh_from_db()
        self.assertEqual(self.user.githubUrl, "")

    def test_github_connect_requires_authentication(self):
        response = self.client.post("/api/auth/oauth/github/connect", {"code": "abc"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(GITHUB_OAUTH_CLIENT_ID="id", GITHUB_OAUTH_CLIENT_SECRET="secret")
    def test_github_connect_stores_verified_profile_and_token(self):
        profile = {"login": "ada", "html_url": "https://github.com/ada"}
        self.client.force_authenticate(user=self.user)

        with patch("authentication.views._exchange_github_code", return_value=("gho_new", profile)):
            response = self.client.post("/api/auth/oauth/github/connect", {"code": "abc"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.githubUrl, "https://github.com/ada")
        self.assertEqual(self.user.githubAccessToken, "gho_new")
        self.assertTrue(response.json()["user"]["githubConnected"])

    @override_settings(GITHUB_OAUTH_CLIENT_ID="id", GITHUB_OAUTH_CLIENT_SECRET="secret")
    def test_github_connect_rejects_failed_exchange(self):
        self.client.force_authenticate(user=self.user)
        with patch("authentication.views._exchange_github_code", return_value=(None, None)):
            response = self.client.post("/api/auth/oauth/github/connect", {"code": "bad"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.githubAccessToken, "")
