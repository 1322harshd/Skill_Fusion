from django.urls import path
from .views import fuse_view, fusion_history_view, quiz_generate, quiz_submit, skills_known_view
urlpatterns = [
    path("", fuse_view, name="fuse"),
    path("history/", fusion_history_view, name="fusion-history"),
    path("quiz/generate/", quiz_generate),
    path("quiz/submit/", quiz_submit),
    path("skills/known/", skills_known_view),
]
