from django.db import models as db_models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatProfile, Conversation, Exchange, PeerMatch, Presence, PrivateMessage, Report, RoomMessage
from .moderation import contains_banned_content
from .serializers import (
    HeartbeatSerializer,
    JoinMatchSerializer,
    ModerationActionSerializer,
    ReportSerializer,
    SendMessageSerializer,
    report_dict,
    room_message_dict,
)
from .services import (
    InvalidResponseError,
    PeerBusyError,
    apply_moderation_action,
    conversation_between,
    current_match_for,
    find_or_create_match,
    get_or_create_chat_profile,
    respond_to_match,
    start_direct_match,
)
from .streak import compute_streak

# A heartbeat older than this is treated as "gone" from the open room.
PRESENCE_WINDOW_SECONDS = 90
# How many distinct reports on one message before it's auto-hidden pending review.
REPORT_AUTO_HIDE_THRESHOLD = 2


def _ban_check(user):
    """Call at the top of any POST that lets a user act in Connect — returns
    a 403 Response to short-circuit the view if they're banned, else None."""
    profile = get_or_create_chat_profile(user)
    if profile.isBanned:
        return Response({"detail": "You're banned from Connect."}, status=status.HTTP_403_FORBIDDEN)
    return None


def _match_payload(match: PeerMatch, requester):
    peer_handle = None
    if match.status in (PeerMatch.Status.ACTIVE, PeerMatch.Status.REQUESTED) and match.userB_id:
        peer = match.other(requester)
        if peer:
            peer_handle = get_or_create_chat_profile(peer).handle
    # Kept even once CLOSED/ACTIVE so the frontend can phrase a "they
    # declined" vs. "you declined" close message correctly for each side.
    direction = None
    if match.requestedBy_id:
        direction = "outgoing" if match.requestedBy_id == requester.pk else "incoming"
    return {
        "matchId": str(match.matchId),
        "status": match.status,
        "fusionLabel": match.fusionLabel,
        "peerHandle": peer_handle,
        "direction": direction,
        "closeReason": match.closeReason if match.status == PeerMatch.Status.CLOSED else None,
        # Once accepted, the handshake hands off to the permanent thread —
        # the frontend should stop polling this match and open the
        # conversation instead.
        "conversationId": str(match.conversation_id) if match.conversation_id else None,
    }


def _conversation_payload(convo: Conversation, viewer):
    peer = convo.other(viewer)
    return {
        "conversationId": str(convo.conversationId),
        "peerHandle": get_or_create_chat_profile(peer).handle,
        "fusionLabel": convo.fusionLabel,
        "status": convo.status,
        "blockedByMe": convo.blockedBy_id == viewer.pk if convo.blockedBy_id else False,
        "lastMessageAt": convo.lastMessageAt.isoformat(),
    }


class MeView(APIView):
    def get(self, request):
        profile = get_or_create_chat_profile(request.user)
        return Response({"handle": profile.handle, "isBanned": profile.isBanned, "warnCount": profile.warnCount})


class PresenceView(APIView):
    def get(self, request):
        cutoff = timezone.now() - timezone.timedelta(seconds=PRESENCE_WINDOW_SECONDS)
        rows = Presence.objects.filter(lastSeenAt__gte=cutoff).exclude(user=request.user).select_related("user")
        out = []
        for p in rows:
            profile = get_or_create_chat_profile(p.user)
            out.append({
                "handle": profile.handle,
                "status": p.status,
                "fusionLabel": p.fusionLabel,
                "streak": compute_streak(p.user),
            })
        return Response(out)

    def post(self, request):
        ban = _ban_check(request.user)
        if ban:
            return ban
        serializer = HeartbeatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Presence.objects.update_or_create(
            user=request.user,
            defaults={"status": serializer.validated_data["status"], "fusionLabel": serializer.validated_data["fusionLabel"]},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomMessagesView(APIView):
    def get(self, request):
        msgs = RoomMessage.objects.filter(hidden=False).select_related("user")[:100]
        user_ids = {m.user_id for m in msgs}
        handle_by_user_id = {
            cp.user_id: cp.handle for cp in ChatProfile.objects.filter(user_id__in=user_ids)
        }
        # Anyone who posted before ever getting a ChatProfile created still
        # needs a handle shown for their messages — create it lazily here.
        missing = user_ids - set(handle_by_user_id)
        for uid in missing:
            from authentication.models import User

            handle_by_user_id[uid] = get_or_create_chat_profile(User.objects.get(pk=uid)).handle
        return Response([room_message_dict(m, request.user, handle_by_user_id) for m in msgs])

    def post(self, request):
        ban = _ban_check(request.user)
        if ban:
            return ban
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = serializer.validated_data["text"]
        flagged = contains_banned_content(text)
        msg = RoomMessage.objects.create(user=request.user, text=text, hidden=flagged)
        if flagged:
            Report.objects.create(
                reporter=None, targetUser=request.user, roomMessage=msg, autoFlagged=True, reason="Auto-flagged by filter"
            )
        handle = get_or_create_chat_profile(request.user).handle
        return Response(room_message_dict(msg, request.user, {request.user.pk: handle}), status=status.HTTP_201_CREATED)


class MatchView(APIView):
    def get(self, request):
        """The caller's current pending handshake, if any — whether they
        started it themselves or someone else's direct request is waiting
        on them. Ongoing conversations (already accepted) live in the
        conversation list instead, not here."""
        match = current_match_for(request.user)
        if not match:
            return Response({"status": "none"})
        return Response(_match_payload(match, request.user))

    def post(self, request):
        ban = _ban_check(request.user)
        if ban:
            return ban
        serializer = JoinMatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        match = find_or_create_match(request.user, serializer.validated_data["fusionLabel"])
        return Response(_match_payload(match, request.user), status=status.HTTP_201_CREATED)


class MatchWithPeerView(APIView):
    """Click-to-message a specific online peer from the open room, instead
    of waiting on the anonymous fusion-label queue."""

    def post(self, request, handle):
        ban = _ban_check(request.user)
        if ban:
            return ban
        target_profile = get_object_or_404(ChatProfile, handle=handle)
        target_user = target_profile.user
        if target_user.pk == request.user.pk:
            return Response({"detail": "That's you."}, status=status.HTTP_400_BAD_REQUEST)

        presence = Presence.objects.filter(user=target_user).first()
        fusion_label = presence.fusionLabel if presence else ""

        try:
            result = start_direct_match(request.user, target_user, fusion_label)
        except PeerBusyError as e:
            return Response({"detail": str(e)}, status=status.HTTP_409_CONFLICT)

        if isinstance(result, Conversation):
            return Response({"kind": "conversation", **_conversation_payload(result, request.user)}, status=status.HTTP_200_OK)
        return Response({"kind": "match", **_match_payload(result, request.user)}, status=status.HTTP_201_CREATED)


class MatchDetailView(APIView):
    def get(self, request, match_id):
        match = get_object_or_404(PeerMatch, matchId=match_id)
        if request.user.pk not in (match.userA_id, match.userB_id):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_match_payload(match, request.user))


class MatchRespondView(APIView):
    """Accept or decline a pending direct chat request (FR-9: two people
    must agree before a direct conversation opens, the first time)."""

    def post(self, request, match_id):
        match = get_object_or_404(PeerMatch, matchId=match_id)
        accept = request.data.get("action") == "accept"
        if request.data.get("action") not in ("accept", "decline"):
            return Response({"detail": "action must be 'accept' or 'decline'."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            match = respond_to_match(request.user, match, accept)
        except InvalidResponseError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_match_payload(match, request.user))


class ConversationListView(APIView):
    """Every permanent thread the caller has, active or blocked — the DM
    inbox (FR-9.x: many ongoing conversations, not one ephemeral slot)."""

    def get(self, request):
        convos = Conversation.objects.filter(
            db_models.Q(userA=request.user) | db_models.Q(userB=request.user)
        )
        return Response([_conversation_payload(c, request.user) for c in convos])


class ConversationDetailView(APIView):
    def get(self, request, conversation_id):
        convo = get_object_or_404(Conversation, conversationId=conversation_id)
        if request.user.pk not in (convo.userA_id, convo.userB_id):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_conversation_payload(convo, request.user))


class ConversationMessagesView(APIView):
    def _get_conversation(self, request, conversation_id):
        convo = get_object_or_404(Conversation, conversationId=conversation_id)
        if request.user.pk not in (convo.userA_id, convo.userB_id):
            return None
        return convo

    def get(self, request, conversation_id):
        convo = self._get_conversation(request, conversation_id)
        if not convo:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        msgs = convo.messages.filter(hidden=False).select_related("sender")[:200]
        handle_by_user_id = {
            cp.user_id: cp.handle for cp in ChatProfile.objects.filter(user_id__in={m.sender_id for m in msgs})
        }
        out = [
            {
                "id": str(m.messageId),
                "handle": handle_by_user_id.get(m.sender_id, "anonymous"),
                "text": m.text,
                "ts": m.createdAt.isoformat(),
                "self": m.sender_id == request.user.pk,
            }
            for m in msgs
        ]
        return Response(out)

    def post(self, request, conversation_id):
        ban = _ban_check(request.user)
        if ban:
            return ban
        convo = self._get_conversation(request, conversation_id)
        if not convo:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if convo.status == Conversation.Status.BLOCKED:
            return Response({"detail": "This conversation is closed."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = serializer.validated_data["text"]
        flagged = contains_banned_content(text)
        msg = PrivateMessage.objects.create(conversation=convo, sender=request.user, text=text, hidden=flagged)
        Conversation.objects.filter(pk=convo.pk).update(lastMessageAt=timezone.now())
        if flagged:
            Report.objects.create(
                reporter=None, targetUser=request.user, privateMessage=msg, autoFlagged=True, reason="Auto-flagged by filter"
            )
        handle = get_or_create_chat_profile(request.user).handle
        return Response(
            {"id": str(msg.messageId), "handle": handle, "text": msg.text, "ts": msg.createdAt.isoformat(), "self": True},
            status=status.HTTP_201_CREATED,
        )


class ReportView(APIView):
    """Reports a single message (room or private) — distinct from
    ReportPeerView, which reports a peer generally without pointing at any
    one message."""

    def post(self, request):
        serializer = ReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data["messageType"] == "room":
            msg = get_object_or_404(RoomMessage, messageId=data["messageId"])
            msg.reportCount += 1
            if msg.reportCount >= REPORT_AUTO_HIDE_THRESHOLD:
                msg.hidden = True
            msg.save(update_fields=["reportCount", "hidden"])
            target_user = msg.user
            report = Report.objects.create(
                reporter=request.user, targetUser=target_user, roomMessage=msg, reason=data["reason"]
            )
        else:
            msg = get_object_or_404(PrivateMessage, messageId=data["messageId"])
            convo = msg.conversation
            if request.user.pk not in (convo.userA_id, convo.userB_id):
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
            msg.reportCount += 1
            if msg.reportCount >= REPORT_AUTO_HIDE_THRESHOLD:
                msg.hidden = True
            msg.save(update_fields=["reportCount", "hidden"])
            target_user = msg.sender
            report = Report.objects.create(
                reporter=request.user, targetUser=target_user, privateMessage=msg, reason=data["reason"]
            )
        return Response(report_dict(report), status=status.HTTP_201_CREATED)


class ReportPeerView(APIView):
    """Report + block the permanent conversation, matching the frontend's
    single 'Report {handle}' action in the private room."""

    def post(self, request, handle):
        target_profile = get_object_or_404(ChatProfile, handle=handle)
        target_user = target_profile.user
        convo = conversation_between(request.user, target_user)
        if not convo:
            return Response({"detail": "No conversation with that peer."}, status=status.HTTP_404_NOT_FOUND)
        convo.status = Conversation.Status.BLOCKED
        convo.blockedBy = request.user
        convo.save(update_fields=["status", "blockedBy"])
        PeerMatch.objects.filter(status=PeerMatch.Status.ACTIVE, conversation=convo).update(
            status=PeerMatch.Status.CLOSED, closeReason=PeerMatch.CloseReason.REPORTED
        )
        report = Report.objects.create(reporter=request.user, targetUser=target_user, reason="Reported from private room")
        return Response(report_dict(report), status=status.HTTP_201_CREATED)


class ExchangeView(APIView):
    """Mutual-consent identity reveal — permanent on the Conversation
    (FR-9.4: once done, it's remembered forever, not per-session)."""

    def _get_conversation(self, request, conversation_id):
        convo = get_object_or_404(Conversation, conversationId=conversation_id)
        if request.user.pk not in (convo.userA_id, convo.userB_id):
            return None
        return convo

    def _payload(self, exchange, convo, user):
        if not exchange:
            return {"status": "none"}
        s = exchange.status_for(user)
        payload = {"status": s}
        if s == Exchange.Status.DONE:
            peer = convo.other(user)
            payload["peer"] = {"fullName": peer.fullName, "email": peer.email}
        return payload

    def get(self, request, conversation_id):
        convo = self._get_conversation(request, conversation_id)
        if not convo:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        exchange = getattr(convo, "exchange", None)
        return Response(self._payload(exchange, convo, request.user))

    def post(self, request, conversation_id):
        convo = self._get_conversation(request, conversation_id)
        if not convo:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get("action")

        exchange = getattr(convo, "exchange", None)
        if action == "propose":
            # Re-proposing an already-proposed exchange is a harmless no-op —
            # just return its current status instead of erroring.
            if exchange:
                return Response(self._payload(exchange, convo, request.user))
            # Proposing counts as that side's own confirmation already.
            is_a = request.user.pk == convo.userA_id
            exchange = Exchange.objects.create(
                conversation=convo, proposedBy=request.user, confirmedA=is_a, confirmedB=not is_a
            )
        elif action == "confirm":
            if not exchange:
                return Response({"detail": "No exchange proposed yet."}, status=status.HTTP_400_BAD_REQUEST)
            is_a = request.user.pk == convo.userA_id
            if is_a:
                exchange.confirmedA = True
            else:
                exchange.confirmedB = True
            exchange.save(update_fields=["confirmedA", "confirmedB"])
        else:
            return Response({"detail": "action must be 'propose' or 'confirm'."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(self._payload(exchange, convo, request.user))


class ModerationReportsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        reports = Report.objects.filter(status=Report.Status.PENDING).select_related(
            "roomMessage", "privateMessage", "targetUser", "targetUser__chat_profile"
        )
        return Response([report_dict(r) for r in reports])


class ModerationActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, report_id):
        report = get_object_or_404(Report, reportId=report_id)
        serializer = ModerationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = apply_moderation_action(report, serializer.validated_data["action"])
        return Response(report_dict(report))
