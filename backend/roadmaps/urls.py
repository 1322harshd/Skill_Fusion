from django.urls import path
from .views import previews_view, choose_view, regenerate_view
urlpatterns=[path("previews/", previews_view), path("choose/", choose_view), path("regenerate/", regenerate_view)]
