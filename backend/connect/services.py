from django.db import models, transaction
from django.utils import timezone

from .models import ChatProfile, PeerMatch, Report


class PeerBusyError(Exception):
    """Raised when a targeted direct-match request's peer already has an
    active conversation (with someone else)."""


class InvalidResponseError(Exception):
    """Raised when accept/decline is attempted on a match that isn't
    actually a pending request waiting on this user."""


def get_or_create_chat_profile(user) -> ChatProfile:
    profile, _ = ChatProfile.objects.get_or_create(user=user)
    return profile


def _open_match_for(user):
    return PeerMatch.objects.filter(
        status__in=[PeerMatch.Status.WAITING, PeerMatch.Status.REQUESTED, PeerMatch.Status.ACTIVE]
    ).filter(models.Q(userA=user) | models.Q(userB=user))


def current_match_for(user):
    """The one open (or just-closed) match this user is part of, from either
    side — whether they started it (queue or direct request) or someone
    else's direct request is waiting on them. Precedence: an ACTIVE chat
    outranks a pending REQUESTED one, which outranks an anonymous WAITING
    queue entry, which outranks a just-CLOSED one (shown once, then gone)."""
    rows = PeerMatch.objects.filter(models.Q(userA=user) | models.Q(userB=user))
    for s in (PeerMatch.Status.ACTIVE, PeerMatch.Status.REQUESTED, PeerMatch.Status.WAITING):
        match = rows.filter(status=s).order_by("-createdAt").first()
        if match:
            return match
    return rows.filter(status=PeerMatch.Status.CLOSED).order_by("-createdAt").first()


@transaction.atomic
def start_direct_match(user, target_user, fusion_label: str) -> PeerMatch:
    """Click-to-message a specific online peer (as opposed to the anonymous
    fusion-label queue in find_or_create_match). Both sides must agree
    before the chat opens (FR-9): this creates a REQUESTED match that the
    target has to accept, rather than connecting them immediately — unless
    the target already sent `user` a request of their own, in which case
    messaging them back counts as accepting it. Refuses with PeerBusyError
    if the target is already ACTIVELY talking to someone else; being merely
    WAITING in the anonymous queue doesn't count as busy."""
    if user.pk == target_user.pk:
        raise ValueError("Can't message yourself.")

    existing_with_target = PeerMatch.objects.filter(
        status__in=[PeerMatch.Status.REQUESTED, PeerMatch.Status.ACTIVE]
    ).filter(models.Q(userA=user, userB=target_user) | models.Q(userA=target_user, userB=user)).first()
    if existing_with_target:
        if (
            existing_with_target.status == PeerMatch.Status.REQUESTED
            and existing_with_target.requestedBy_id == target_user.pk
        ):
            existing_with_target.status = PeerMatch.Status.ACTIVE
            existing_with_target.save(update_fields=["status"])
        return existing_with_target

    target_active = PeerMatch.objects.filter(status=PeerMatch.Status.ACTIVE).filter(
        models.Q(userA=target_user) | models.Q(userB=target_user)
    ).exists()
    if target_active:
        raise PeerBusyError("That peer is already in a conversation.")

    _open_match_for(user).update(status=PeerMatch.Status.CLOSED, closeReason=PeerMatch.CloseReason.LEFT)

    return PeerMatch.objects.create(
        userA=user,
        userB=target_user,
        fusionLabel=fusion_label,
        status=PeerMatch.Status.REQUESTED,
        requestedBy=user,
    )


@transaction.atomic
def respond_to_match(user, match: PeerMatch, accept: bool) -> PeerMatch:
    if match.status != PeerMatch.Status.REQUESTED or user.pk not in (match.userA_id, match.userB_id):
        raise InvalidResponseError("This request is no longer pending.")
    if match.requestedBy_id == user.pk:
        raise InvalidResponseError("You can't accept or decline your own request.")

    if accept:
        match.status = PeerMatch.Status.ACTIVE
        match.save(update_fields=["status"])
    else:
        match.status = PeerMatch.Status.CLOSED
        match.closeReason = PeerMatch.CloseReason.DECLINED
        match.save(update_fields=["status", "closeReason"])
    return match


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
    existing WAITING match for the same fusion (started by someone else),
    or opens a new one to wait for a peer."""
    existing_open = PeerMatch.objects.filter(
        status=PeerMatch.Status.ACTIVE, userA=user
    ).first() or PeerMatch.objects.filter(status=PeerMatch.Status.ACTIVE, userB=user).first()
    if existing_open:
        return existing_open

    waiting = (
        PeerMatch.objects.select_for_update()
        .filter(status=PeerMatch.Status.WAITING, fusionLabel=fusion_label)
        .exclude(userA=user)
        .order_by("createdAt")
        .first()
    )
    if waiting:
        waiting.userB = user
        waiting.status = PeerMatch.Status.ACTIVE
        waiting.save(update_fields=["userB", "status"])
        return waiting

    own_waiting = PeerMatch.objects.filter(
        status=PeerMatch.Status.WAITING, userA=user, fusionLabel=fusion_label
    ).first()
    if own_waiting:
        return own_waiting

    return PeerMatch.objects.create(userA=user, fusionLabel=fusion_label, status=PeerMatch.Status.WAITING)
