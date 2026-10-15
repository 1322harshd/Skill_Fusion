from django.urls import path

from . import views

posts_urlpatterns = [
    path("generate", views.GeneratePostView.as_view()),
    path("", views.PostDraftListView.as_view()),
    path("<uuid:post_id>", views.PostDraftDetailView.as_view()),
]
