import requests
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .cookies import clear_refresh_cookie, set_refresh_cookie
from .emails import send_password_reset_email, send_verification_email
from .models import User
from .serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
)
from .tokens import resolve_uid_token


def _auth_payload(user, status_code):
    refresh = RefreshToken.for_user(user)
    response = Response(
        {"user": UserSerializer(user).data, "accessToken": str(refresh.access_token)},
        status=status_code,
    )
    set_refresh_cookie(response, refresh)
    return response


def _get_or_create_oauth_user(email, full_name, github_url=""):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "fullName": full_name or email.split("@")[0],
            "githubUrl": github_url,
            "isEmailVerified": True,
        },
    )
    if created:
        user.set_unusable_password()
        user.save(update_fields=["password"])
    return user


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_verification_email(user)
        return _auth_payload(user, status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return _auth_payload(user, status.HTTP_200_OK)


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw_token = request.COOKIES.get(settings.REFRESH_TOKEN_COOKIE_NAME)
        if not raw_token:
            return Response({"detail": "Refresh token missing."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            old_refresh = RefreshToken(raw_token)
            user = User.objects.get(pk=old_refresh[settings.SIMPLE_JWT["USER_ID_CLAIM"]])
        except (TokenError, User.DoesNotExist):
            return Response({"detail": "Invalid or expired refresh token."}, status=status.HTTP_401_UNAUTHORIZED)

        if settings.SIMPLE_JWT.get("BLACKLIST_AFTER_ROTATION"):
            try:
                old_refresh.blacklist()
            except AttributeError:
                pass

        new_refresh = RefreshToken.for_user(user)
        response = Response({"accessToken": str(new_refresh.access_token)}, status=status.HTTP_200_OK)
        set_refresh_cookie(response, new_refresh)
        return response


class LogoutView(APIView):
    def post(self, request):
        raw_token = request.COOKIES.get(settings.REFRESH_TOKEN_COOKIE_NAME)
        if raw_token:
            try:
                RefreshToken(raw_token).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(response)
        return response


class MeView(APIView):
    def get(self, request):
        return Response({"user": UserSerializer(request.user).data})

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"user": serializer.data})

    def delete(self, request):
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new"])
        request.user.save(update_fields=["password"])
        return Response(status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        if user is not None:
            send_password_reset_email(user)
        # Always 200, regardless of whether the email exists, to avoid account enumeration.
        return Response(status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = resolve_uid_token(serializer.validated_data["token"])
        if user is None:
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["newPassword"])
        user.save(update_fields=["password"])
        return Response(status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token", "")
        user = resolve_uid_token(token)
        if user is None:
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        user.isEmailVerified = True
        user.save(update_fields=["isEmailVerified"])
        return Response(status=status.HTTP_200_OK)


class GithubOAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.GITHUB_OAUTH_CLIENT_ID or not settings.GITHUB_OAUTH_CLIENT_SECRET:
            return Response(
                {"detail": "GitHub OAuth is not configured on the server yet."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        code = request.data.get("code")
        if not code:
            return Response({"detail": "code is required."}, status=status.HTTP_400_BAD_REQUEST)

        token_res = requests.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.GITHUB_OAUTH_CLIENT_ID,
                "client_secret": settings.GITHUB_OAUTH_CLIENT_SECRET,
                "code": code,
            },
            timeout=10,
        )
        access_token = token_res.json().get("access_token")
        if not access_token:
            return Response({"detail": "Could not authenticate with GitHub."}, status=status.HTTP_400_BAD_REQUEST)

        profile = requests.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        ).json()

        email = profile.get("email")
        if not email:
            emails = requests.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            ).json()
            primary = next((e for e in emails if e.get("primary") and e.get("verified")), None)
            email = primary["email"] if primary else None

        if not email:
            return Response(
                {"detail": "Could not retrieve a verified email from GitHub."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = _get_or_create_oauth_user(
            email=email,
            full_name=profile.get("name") or profile.get("login", ""),
            github_url=profile.get("html_url", ""),
        )
        return _auth_payload(user, status.HTTP_200_OK)


class GoogleOAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.GOOGLE_OAUTH_CLIENT_ID or not settings.GOOGLE_OAUTH_CLIENT_SECRET:
            return Response(
                {"detail": "Google OAuth is not configured on the server yet."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        code = request.data.get("code")
        redirect_uri = request.data.get("redirectUri", "")
        if not code:
            return Response({"detail": "code is required."}, status=status.HTTP_400_BAD_REQUEST)

        token_res = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
        access_token = token_res.json().get("access_token")
        if not access_token:
            return Response({"detail": "Could not authenticate with Google."}, status=status.HTTP_400_BAD_REQUEST)

        profile = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        ).json()

        email = profile.get("email")
        if not email or not profile.get("email_verified"):
            return Response(
                {"detail": "Could not retrieve a verified email from Google."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = _get_or_create_oauth_user(email=email, full_name=profile.get("name", ""))
        return _auth_payload(user, status.HTTP_200_OK)
