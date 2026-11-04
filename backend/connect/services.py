from django.db import models, transaction
from django.utils import timezone

from .models import ChatProfile, Conversation, PeerMatch, Report


class PeerBusyError(Exception):
    """Raised when trying to message a peer whose Conversation with `user`
    is BLOCKED (one of them reported the other)."""


class InvalidResponseError(Exception):
    """Raised when accept/decline is attempted on a match that isn't
    actually a pending request waiting on this user."""


def get_or_create_chat_profile(user) -> ChatProfile:
    profile, _ = ChatProfile.objects.get_or_create(user=user)
    return profile


def _ordered_pair(user_x, user_y):
    """Sorts two users by pk so a pair always maps to the same (userA,
    userB) order regardless of who's asking — what makes Conversation's
    unique constraint on (userA, userB) actually work."""
    return (user_x, user_y) if str(user_x.pk) < str(user_y.pk) else (user_y, user_x)


def conversation_between(user_x, user_y):
    a, b = _ordered_pair(user_x, user_y)
    return Conversation.objects.filter(userA=a, userB=b).first()


@transaction.atomic
def get_or_create_conversation(user_x, user_y, fusion_label: str = "") -> Conversation:
    """The one permanent thread between these two people — created the first
    time they connect, reused forever after regardless of how many separate
    PeerMatch handshakes happen between them over time."""
    a, b = _ordered_pair(user_x, user_y)
    convo, _ = Conversation.objects.get_or_create(userA=a, userB=b, defaults={"fusionLabel": fusion_label})
    return convo


def current_match_for(user):
    """The user's one pending handshake, if any: an anonymous WAITING queue
    entry, a REQUESTED direct ask (incoming or outgoing), or — shown once —
    a just-CLOSED request so a decline doesn't pass silently. Once accepted,
    a match resolves into a permanent Conversation and stops showing up
    here; ongoing chats live in the conversation list instead."""
    rows = PeerMatch.objects.filter(models.Q(userA=user) | models.Q(userB=user))
    for s in (PeerMatch.Status.REQUESTED, PeerMatch.Status.WAITING):
        match = rows.filter(status=s).order_by("-createdAt").first()
        if match:
            return match
    return rows.filter(status=PeerMatch.Status.CLOSED).order_by("-createdAt").first()


@transaction.atomic
def respond_to_match(user, match: PeerMatch, accept: bool) -> PeerMatch:
    if match.status != PeerMatch.Status.REQUESTED or user.pk not in (match.userA_id, match.userB_id):
        raise InvalidResponseError("This request is no longer pending.")
    if match.requestedBy_id == user.pk:
        raise InvalidResponseError("You can't accept or decline your own request.")

    if accept:
        convo = get_or_create_conversation(match.userA, match.userB, match.fusionLabel)
        match.status = PeerMatch.Status.ACTIVE
        match.conversation = convo
        match.save(update_fields=["status", "conversation"])
    else:
        match.status = PeerMatch.Status.CLOSED
        match.closeReason = PeerMatch.CloseReason.DECLINED
        match.save(update_fields=["status", "closeReason"])
    return match


@transaction.atomic
def start_direct_match(user, target_user, fusion_label: str):
    """Click-to-message a specific peer. Returns a Conversation directly if
    one already exists between them (from any past accepted match — no
    repeat consent needed, same as messaging an existing contact on any
    other platform) and a PeerMatch otherwise: resuming a pending request,
    auto-accepting if the target already asked `user` first, or opening a
    fresh REQUESTED handshake for a brand-new pair."""
    if user.pk == target_user.pk:
        raise ValueError("Can't message yourself.")

    existing_convo = conversation_between(user, target_user)
    if existing_convo:
        if existing_convo.status == Conversation.Status.BLOCKED:
            raise PeerBusyError("You can't message this peer.")
        return existing_convo

    existing_request = PeerMatch.objects.filter(status=PeerMatch.Status.REQUESTED).filter(
        models.Q(userA=user, userB=target_user) | models.Q(userA=target_user, userB=user)
    ).first()
    if existing_request:
        if existing_request.requestedBy_id == target_user.pk:
            return respond_to_match(user, existing_request, accept=True)
        return existing_request

    return PeerMatch.objects.create(
        userA=user, userB=target_user, fusionLabel=fusion_label,
        status=PeerMatch.Status.REQUESTED, requestedBy=user,
    )


@transaction.atomic
def apply_moderation_action(report: Report, action: str) -> Report:
    """Warn/ban/dismiss a report's target — the one place this logic lives,
    used by both the REST moderation endpoint and the Django admin actions
    so the two can't drift apart."""
    profile = get_or_create_chat_profile(report.targetUser)
    if action == "warn":
        profile.warnCount += 1
        profile.save(update_fields=["warnCount"])
        report.action = Report.Action.WARNED
    elif action == "ban":
        profile.isBanned = True
        profile.save(update_fields=["isBanned"])
        report.action = Report.Action.BANNED
    elif action == "dismiss":
        report.action = Report.Action.DISMISSED
    else:
        raise ValueError("action must be 'warn', 'ban' or 'dismiss'.")

    report.status = Report.Status.REVIEWED
    report.reviewedAt = timezone.now()
    report.save(update_fields=["status", "action", "reviewedAt"])
    return report


@transaction.atomic
def find_or_create_match(user, fusion_label: str) -> PeerMatch:
    """Anonymous peer matching by shared skill fusion (FR-9.1). Joins an
    existing WAITING match for the same fusion (started by someone else) and
    immediately resolves it into a permanent Conversation, or opens a new
    one to wait for a peer."""
    own_waiting = PeerMatch.objects.filter(
        status=PeerMatch.Status.WAITING, userA=user, fusionLabel=fusion_label
    ).first()
    if own_waiting:
        return own_waiting

    waiting = (
        PeerMatch.objects.select_for_update()
        .filter(status=PeerMatch.Status.WAITING, fusionLabel=fusion_label)
        .exclude(userA=user)
        .order_by("createdAt")
        .first()
    )
    if waiting:
        convo = get_or_create_conversation(waiting.userA, user, fusion_label)
        waiting.userB = user
        waiting.status = PeerMatch.Status.ACTIVE
        waiting.conversation = convo
        waiting.save(update_fields=["userB", "status", "conversation"])
        return waiting

    return PeerMatch.objects.create(userA=user, fusionLabel=fusion_label, status=PeerMatch.Status.WAITING)
