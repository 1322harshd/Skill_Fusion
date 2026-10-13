from django.urls import path
from .views import score_view
urlpatterns=[path("", score_view)]
