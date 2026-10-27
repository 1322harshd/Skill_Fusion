from django.urls import path
from .views import project_view, submit_view
urlpatterns=[path("", project_view), path("submit", submit_view)]
