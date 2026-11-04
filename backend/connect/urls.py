from django.urls import path

from . import views

connect_urlpatterns = [
    path("me", views.MeView.as_view()),
    path("presence", views.PresenceView.as_view()),
    path("room/messages", views.RoomMessagesView.as_view()),
    # The handshake: anonymous queue matching or a direct peer request, plus
    # accept/decline — ends either in nothing or a permanent conversation.
    path("match", views.MatchView.as_view()),
    path("peers/<str:handle>/match", views.MatchWithPeerView.as_view()),
    path("matches/<uuid:match_id>", views.MatchDetailView.as_view()),
    path("matches/<uuid:match_id>/respond", views.MatchRespondView.as_view()),
    # Permanent conversations — messages and the identity exchange live here,
    # independent of whichever handshake originally created the thread.
    path("conversations", views.ConversationListView.as_view()),
    path("conversations/<uuid:conversation_id>", views.ConversationDetailView.as_view()),
    path("conversations/<uuid:conversation_id>/messages", views.ConversationMessagesView.as_view()),
    path("conversations/<uuid:conversation_id>/exchange", views.ExchangeView.as_view()),
    path("report", views.ReportView.as_view()),
    path("peers/<str:handle>/report", views.ReportPeerView.as_view()),
    # Staff-only moderation queue, mirrored by the Django admin screens.
    path("moderation/reports", views.ModerationReportsView.as_view()),
    path("moderation/reports/<uuid:report_id>/action", views.ModerationActionView.as_view()),
]
