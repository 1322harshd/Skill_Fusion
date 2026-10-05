from django.urls import path

from . import views

auth_urlpatterns = [
    path("register", views.RegisterView.as_view()),
    path("login", views.LoginView.as_view()),
    path("refresh", views.RefreshView.as_view()),
    path("logout", views.LogoutView.as_view()),
    path("me", views.MeView.as_view()),
    path("change-password", views.ChangePasswordView.as_view()),
    path("forgot", views.ForgotPasswordView.as_view()),
    path("reset", views.ResetPasswordView.as_view()),
    path("verify-email", views.VerifyEmailView.as_view()),
    path("resend-verification", views.ResendVerificationEmailView.as_view()),
    path("oauth/github", views.GithubOAuthView.as_view()),
    path("oauth/github/config", views.GithubOAuthConfigView.as_view()),
    path("oauth/github/connect", views.GithubConnectView.as_view()),
    path("oauth/google", views.GoogleOAuthView.as_view()),
]

users_urlpatterns = [
    path("me", views.MeView.as_view()),
]
