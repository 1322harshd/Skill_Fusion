import random
import uuid

from django.conf import settings
from django.db import models

ADJECTIVES = [
    "swift", "quiet", "bold", "keen", "rare", "bright", "calm", "sharp",
    "warm", "steady", "quick", "clear", "deep", "wide", "true", "fresh",
]
NOUNS = [
    "fox", "owl", "hawk", "wren", "lynx", "otter", "falcon", "heron",
    "finch", "badger", "marten", "kestrel", "whale", "sparrow", "crane", "stoat",
]


def generate_handle():
    return f"{random.choice(ADJECTIVES)}.{random.choice(NOUNS)}{random.randint(10, 99)}"


class ChatProfile(models.Model):
    """A user's anonymous identity within Connect — deliberately not derived
    from email/name, so peers only ever see this until a mutual Exchange."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_profile")
    handle = models.CharField(max_length=30, unique=True, default=generate_handle)
    isBanned = models.BooleanField(default=False)
    warnCount = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.handle


class Presence(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        IDLE = "idle", "Idle"
        AWAY = "away", "Away"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="presence")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    fusionLabel = models.CharField(max_length=100, blank=True, default="")
    lastSeenAt = models.DateTimeField(auto_now=True)


class RoomMessage(models.Model):
    messageId = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="room_messages")
    text = models.TextField(max_length=1000)
    createdAt = models.DateTimeField(auto_now_add=True)
    hidden = models.BooleanField(default=False)
    reportCount = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["createdAt"]


class PeerMatch(models.Model):
    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting"
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"

    matchId = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fusionLabel = models.CharField(max_length=100)
    userA = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="matches_as_a")
    userB = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="matches_as_b", null=True, blank=True
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.WAITING)
    createdAt = models.DateTimeField(auto_now_add=True)

    def other(self, user):
        return self.userB if user.pk == self.userA.pk else self.userA


class PrivateMessage(models.Model):
    messageId = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(PeerMatch, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField(max_length=1000)
    createdAt = models.DateTimeField(auto_now_add=True)
    hidden = models.BooleanField(default=False)
    reportCount = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["createdAt"]


class Exchange(models.Model):
    class Status(models.TextChoices):
        NONE = "none", "None"
        AWAITING_PEER = "awaiting-peer", "Awaiting peer"
        AWAITING_YOU = "awaiting-you", "Awaiting you"
        DONE = "done", "Done"

    match = models.OneToOneField(PeerMatch, on_delete=models.CASCADE, related_name="exchange")
    proposedBy = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    confirmedA = models.BooleanField(default=False)
    confirmedB = models.BooleanField(default=False)
    createdAt = models.DateTimeField(auto_now_add=True)

    def status_for(self, user):
        both = self.confirmedA and self.confirmedB
        if both:
            return self.Status.DONE
        is_proposer = user.pk == self.proposedBy.pk
        confirmed_mine = self.confirmedA if user.pk == self.match.userA.pk else self.confirmedB
        if confirmed_mine:
            return self.Status.AWAITING_PEER
        return self.Status.AWAITING_YOU if not is_proposer else self.Status.AWAITING_PEER


class Report(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        REVIEWED = "reviewed", "Reviewed"

    class Action(models.TextChoices):
        NONE = "none", "None"
        WARNED = "warned", "Warned"
        BANNED = "banned", "Banned"
        DISMISSED = "dismissed", "Dismissed"

    reportId = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="reports_filed"
    )
    targetUser = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_received"
    )
    roomMessage = models.ForeignKey(RoomMessage, on_delete=models.CASCADE, null=True, blank=True)
    privateMessage = models.ForeignKey(PrivateMessage, on_delete=models.CASCADE, null=True, blank=True)
    reason = models.CharField(max_length=300, blank=True, default="")
    autoFlagged = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    action = models.CharField(max_length=10, choices=Action.choices, default=Action.NONE)
    createdAt = models.DateTimeField(auto_now_add=True)
    reviewedAt = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-createdAt"]
