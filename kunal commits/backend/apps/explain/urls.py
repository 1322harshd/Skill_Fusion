from django.urls import path
from .views import explain_view
urlpatterns=[path("", explain_view)]
