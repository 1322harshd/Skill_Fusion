from django.urls import path
from .views import generate_view
urlpatterns=[path("generate/", generate_view)]
