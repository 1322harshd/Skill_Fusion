from django.urls import path

from . import views

resume_urlpatterns = [
    path("upload", views.ResumeUploadView.as_view()),
    path("generate", views.GenerateResumeView.as_view()),
    path("upload", views.ResumeUploadView.as_view()),
    path("", views.ResumeDocumentListView.as_view()),
    path("<uuid:document_id>/export", views.ResumeExportView.as_view()),
]
