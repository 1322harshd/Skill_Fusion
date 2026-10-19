from django.db import transaction

from .models import ChatProfile, PeerMatch


def get_or_create_chat_profile(user) -> ChatProfile:
    profile, _ = ChatProfile.objects.get_or_create(user=user)
    return profile


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
