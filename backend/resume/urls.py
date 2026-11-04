from django.urls import path

from . import views

# Routes for generating a tailored resume/cover letter, uploading a base resume, and exporting.
resume_urlpatterns = [
    path("generate", views.GenerateResumeView.as_view()),
    path("upload", views.ResumeUploadView.as_view()),
    path("", views.ResumeDocumentListView.as_view()),
    path("<uuid:document_id>/export", views.ResumeExportView.as_view()),
]
