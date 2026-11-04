from rest_framework import serializers

from .models import Report, RoomMessage

# Plain input validators for the Connect endpoints — none of these map to a
# model directly, so they're declared with serializers.Serializer rather than
# ModelSerializer.


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=1000)


class ReportSerializer(serializers.Serializer):
    messageType = serializers.ChoiceField(choices=["room", "private"])
    messageId = serializers.UUIDField()
    reason = serializers.CharField(required=False, allow_blank=True, max_length=300, default="")


class JoinMatchSerializer(serializers.Serializer):
    fusionLabel = serializers.CharField(max_length=100)


class HeartbeatSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["active", "idle", "away"], default="active")
    fusionLabel = serializers.CharField(required=False, allow_blank=True, max_length=100, default="")


class ModerationActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["warn", "ban", "dismiss"])


def room_message_dict(msg: RoomMessage, viewer, handle_by_user_id):
    # handle_by_user_id is precomputed by the caller (one query for a whole
    # page of messages) rather than looked up here per-message.
    return {
        "id": str(msg.messageId),
        "handle": handle_by_user_id.get(msg.user_id, "anonymous"),
        "text": msg.text,
        "ts": msg.createdAt.isoformat(),
        "self": msg.user_id == viewer.pk,
        "hidden": msg.hidden,
    }


def report_dict(r: Report):
    # A report is either about a room message or a private one, never both —
    # the unused side's id/text fields just come back null.
    return {
        "reportId": str(r.reportId),
        "reason": r.reason,
        "autoFlagged": r.autoFlagged,
        "status": r.status,
        "action": r.action,
        "createdAt": r.createdAt.isoformat(),
        "roomMessageId": str(r.roomMessage_id) if r.roomMessage_id else None,
        "roomMessageText": r.roomMessage.text if r.roomMessage_id else None,
        "privateMessageId": str(r.privateMessage_id) if r.privateMessage_id else None,
        "privateMessageText": r.privateMessage.text if r.privateMessage_id else None,
        "targetHandle": getattr(getattr(r.targetUser, "chat_profile", None), "handle", "unknown"),
    }
