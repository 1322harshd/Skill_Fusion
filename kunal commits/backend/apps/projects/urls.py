from django.urls import path
from .views import project_view
urlpatterns=[path("", project_view)]
