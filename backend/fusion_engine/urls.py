from django.urls import path
from .views import fuse_view, quiz_generate, quiz_submit
urlpatterns = [
    path("", fuse_view, name="fuse"),
    path("quiz/generate/", quiz_generate),
    path("quiz/submit/", quiz_submit),
]
