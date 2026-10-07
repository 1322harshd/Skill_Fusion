from django.urls import path

from . import views

growthlog_urlpatterns = [
    path("entries", views.EntryListCreateView.as_view()),
    path("entries/<uuid:entry_id>", views.EntryDetailView.as_view()),
    path("entries/<uuid:entry_id>/verify-credential", views.VerifyCredentialView.as_view()),
    path("github-import", views.GithubImportView.as_view()),
    path("github-contributions", views.GithubContributionsView.as_view()),
    path("stats", views.StatsView.as_view()),
]
