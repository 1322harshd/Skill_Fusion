from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatProfile, Exchange, PeerMatch, Presence, PrivateMessage, Report, RoomMessage
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
from .services import find_or_create_match, get_or_create_chat_profile

PRESENCE_WINDOW_SECONDS = 90
REPORT_AUTO_HIDE_THRESHOLD = 2


def _ban_check(user):
    profile = get_or_create_chat_profile(user)
    if profile.isBanned:
        return Response({"detail": "You're banned from Connect."}, status=status.HTTP_403_FORBIDDEN)
    return None


def _match_payload(match: PeerMatch, requester):
    peer_handle = None
    if match.status == PeerMatch.Status.ACTIVE:
        peer = match.other(requester)
        if peer:
            peer_handle = get_or_create_chat_profile(peer).handle
    return {
        "matchId": str(match.matchId),
        "status": match.status,
        "fusionLabel": match.fusionLabel,
        "peerHandle": peer_handle,
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
            out.append({"handle": profile.handle, "status": p.status, "fusionLabel": p.fusionLabel})
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
    def post(self, request):
        ban = _ban_check(request.user)
        if ban:
            return ban
        serializer = JoinMatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        match = find_or_create_match(request.user, serializer.validated_data["fusionLabel"])
        return Response(_match_payload(match, request.user), status=status.HTTP_201_CREATED)


class MatchDetailView(APIView):
    def get(self, request, match_id):
        match = get_object_or_404(PeerMatch, matchId=match_id)
        if request.user.pk not in (match.userA_id, match.userB_id):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_match_payload(match, request.user))


class MatchMessagesView(APIView):
    def _get_match(self, request, match_id):
        match = get_object_or_404(PeerMatch, matchId=match_id)
        if request.user.pk not in (match.userA_id, match.userB_id):
            return None
        return match

    def get(self, request, match_id):
        match = self._get_match(request, match_id)
        if not match:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        msgs = match.messages.filter(hidden=False).select_related("sender")[:200]
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

    def post(self, request, match_id):
        ban = _ban_check(request.user)
        if ban:
            return ban
        match = self._get_match(request, match_id)
        if not match:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = serializer.validated_data["text"]
        flagged = contains_banned_content(text)
        msg = PrivateMessage.objects.create(match=match, sender=request.user, text=text, hidden=flagged)
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
            match = msg.match
            if request.user.pk not in (match.userA_id, match.userB_id):
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
    """Report + close the conversation, matching the frontend's single
    'Report {handle}' action in the private room."""

    def post(self, request, handle):
        target_profile = get_object_or_404(ChatProfile, handle=handle)
        target_user = target_profile.user
        match = (
            PeerMatch.objects.filter(status=PeerMatch.Status.ACTIVE)
            .filter(userA=request.user, userB=target_user)
            .first()
            or PeerMatch.objects.filter(status=PeerMatch.Status.ACTIVE)
            .filter(userA=target_user, userB=request.user)
            .first()
        )
        if not match:
            return Response({"detail": "No active match with that peer."}, status=status.HTTP_404_NOT_FOUND)
        match.status = PeerMatch.Status.CLOSED
        match.save(update_fields=["status"])
        report = Report.objects.create(reporter=request.user, targetUser=target_user, reason="Reported from private room")
        return Response(report_dict(report), status=status.HTTP_201_CREATED)


class ExchangeView(APIView):
    def _get_match(self, request, match_id):
        match = get_object_or_404(PeerMatch, matchId=match_id)
        if request.user.pk not in (match.userA_id, match.userB_id):
            return None
        return match

    def _payload(self, exchange, match, user):
        if not exchange:
            return {"status": "none"}
        s = exchange.status_for(user)
        payload = {"status": s}
        if s == Exchange.Status.DONE:
            peer = match.other(user)
            payload["peer"] = {"fullName": peer.fullName, "email": peer.email}
        return payload

    def get(self, request, match_id):
        match = self._get_match(request, match_id)
        if not match:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        exchange = getattr(match, "exchange", None)
        return Response(self._payload(exchange, match, request.user))

    def post(self, request, match_id):
        match = self._get_match(request, match_id)
        if not match:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get("action")

        exchange = getattr(match, "exchange", None)
        if action == "propose":
            if exchange:
                return Response(self._payload(exchange, match, request.user))
            is_a = request.user.pk == match.userA_id
            exchange = Exchange.objects.create(
                match=match, proposedBy=request.user, confirmedA=is_a, confirmedB=not is_a
            )
        elif action == "confirm":
            if not exchange:
                return Response({"detail": "No exchange proposed yet."}, status=status.HTTP_400_BAD_REQUEST)
            is_a = request.user.pk == match.userA_id
            if is_a:
                exchange.confirmedA = True
            else:
                exchange.confirmedB = True
            exchange.save(update_fields=["confirmedA", "confirmedB"])
        else:
            return Response({"detail": "action must be 'propose' or 'confirm'."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(self._payload(exchange, match, request.user))


class ModerationReportsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        reports = Report.objects.filter(status=Report.Status.PENDING).select_related(
            "roomMessage", "targetUser", "targetUser__chat_profile"
        )
        return Response([report_dict(r) for r in reports])


class ModerationActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, report_id):
        report = get_object_or_404(Report, reportId=report_id)
        serializer = ModerationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]

        profile = get_or_create_chat_profile(report.targetUser)
        if action == "warn":
            profile.warnCount += 1
            profile.save(update_fields=["warnCount"])
            report.action = Report.Action.WARNED
        elif action == "ban":
            profile.isBanned = True
            profile.save(update_fields=["isBanned"])
            report.action = Report.Action.BANNED
        else:
            report.action = Report.Action.DISMISSED

        report.status = Report.Status.REVIEWED
        report.reviewedAt = timezone.now()
        report.save(update_fields=["status", "action", "reviewedAt"])
        return Response(report_dict(report))
