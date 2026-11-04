from django.urls import path
from .views import project_view, submit_view, submission_status_view, regrade_view
urlpatterns=[path("", project_view), path("submit", submit_view),
             path("submission", submission_status_view), path("regrade", regrade_view)]
