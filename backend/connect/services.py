from django.db import models, transaction

from .models import ChatProfile, PeerMatch


class PeerBusyError(Exception):
    """Raised when a targeted direct-match request's peer already has an
    open conversation (with someone else)."""


def get_or_create_chat_profile(user) -> ChatProfile:
    profile, _ = ChatProfile.objects.get_or_create(user=user)
    return profile


def _open_match_for(user):
    return PeerMatch.objects.filter(status__in=[PeerMatch.Status.WAITING, PeerMatch.Status.ACTIVE]).filter(
        models.Q(userA=user) | models.Q(userB=user)
    )


@transaction.atomic
def start_direct_match(user, target_user, fusion_label: str) -> PeerMatch:
    """Click-to-message a specific online peer (as opposed to the anonymous
    fusion-label queue in find_or_create_match). Resumes an existing match
    with that exact peer if one's already open. Otherwise closes whatever
    conversation `user` currently has open (only one at a time, same as the
    queue flow) — unless the target is already ACTIVELY talking to someone
    else, in which case this refuses rather than forcing it. A target who's
    merely WAITING in the anonymous queue isn't "busy"; this just claims
    that waiting match directly instead of leaving it to the queue."""
    if user.pk == target_user.pk:
        raise ValueError("Can't message yourself.")

    # A WAITING match only ever has one participant, so only an ACTIVE match
    # can possibly already pair these two specific users.
    existing_with_target = PeerMatch.objects.filter(status=PeerMatch.Status.ACTIVE).filter(
        models.Q(userA=user, userB=target_user) | models.Q(userA=target_user, userB=user)
    ).first()
    if existing_with_target:
        return existing_with_target

    target_active = PeerMatch.objects.filter(status=PeerMatch.Status.ACTIVE).filter(
        models.Q(userA=target_user) | models.Q(userB=target_user)
    ).exists()
    if target_active:
        raise PeerBusyError("That peer is already in a conversation.")

    _open_match_for(user).update(status=PeerMatch.Status.CLOSED)

    target_waiting = (
        PeerMatch.objects.select_for_update()
        .filter(status=PeerMatch.Status.WAITING, userA=target_user)
        .first()
    )
    if target_waiting:
        target_waiting.userB = user
        target_waiting.status = PeerMatch.Status.ACTIVE
        target_waiting.save(update_fields=["userB", "status"])
        return target_waiting

    return PeerMatch.objects.create(
        userA=target_user, userB=user, fusionLabel=fusion_label, status=PeerMatch.Status.ACTIVE
    )


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
