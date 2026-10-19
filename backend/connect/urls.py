from django.urls import path

from . import views

connect_urlpatterns = [
    path("me", views.MeView.as_view()),
    path("presence", views.PresenceView.as_view()),
    path("room/messages", views.RoomMessagesView.as_view()),
    path("match", views.MatchView.as_view()),
    path("matches/<uuid:match_id>", views.MatchDetailView.as_view()),
    path("matches/<uuid:match_id>/messages", views.MatchMessagesView.as_view()),
    path("matches/<uuid:match_id>/exchange", views.ExchangeView.as_view()),
    path("report", views.ReportView.as_view()),
    path("peers/<str:handle>/report", views.ReportPeerView.as_view()),
    path("moderation/reports", views.ModerationReportsView.as_view()),
    path("moderation/reports/<uuid:report_id>/action", views.ModerationActionView.as_view()),
]
