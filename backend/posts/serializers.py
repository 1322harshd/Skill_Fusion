from rest_framework import serializers

from .models import PostDraft


class PostDraftSerializer(serializers.ModelSerializer):
    """Read-only view of a post draft; the entry it's about is exposed as just its id."""

    entryId = serializers.UUIDField(source="entry_id", read_only=True)

    class Meta:
        model = PostDraft
        fields = ["postId", "entryId", "tone", "text", "status", "createdAt", "updatedAt"]
        read_only_fields = ["postId", "entryId", "createdAt", "updatedAt"]


class GeneratePostSerializer(serializers.Serializer):
    """Request to generate a new draft: which entry, what tone, and a salt to force a fresh variation."""

    entryId = serializers.UUIDField()
    tone = serializers.ChoiceField(choices=["Professional", "Warm", "Punchy"], default="Warm")
    salt = serializers.IntegerField(default=0, min_value=0)


class UpdatePostSerializer(serializers.Serializer):
    """Partial update to a draft's text and/or status (e.g. moving it to queued/shared)."""

    text = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    status = serializers.ChoiceField(choices=PostDraft.Status.choices, required=False)
