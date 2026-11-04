from django.urls import path

from . import views

# Routes for generating, listing, and managing AI-drafted posts.
posts_urlpatterns = [
    path("generate", views.GeneratePostView.as_view()),
    path("", views.PostDraftListView.as_view()),
    path("<uuid:post_id>", views.PostDraftDetailView.as_view()),
]
