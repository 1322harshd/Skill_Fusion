from django.urls import path
from .views import previews_view, choose_view, regenerate_view, tweak_view, progress_view, chosen_view
urlpatterns=[path("previews/", previews_view), path("choose/", choose_view), path("regenerate/", regenerate_view), path("tweak/", tweak_view), path("progress/", progress_view), path("chosen/", chosen_view)]
