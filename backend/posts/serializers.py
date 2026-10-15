from rest_framework import serializers

from .models import PostDraft


class PostDraftSerializer(serializers.ModelSerializer):
    entryId = serializers.UUIDField(source="entry_id", read_only=True)

    class Meta:
        model = PostDraft
        fields = ["postId", "entryId", "tone", "text", "status", "createdAt", "updatedAt"]
        read_only_fields = ["postId", "entryId", "createdAt", "updatedAt"]


class GeneratePostSerializer(serializers.Serializer):
    entryId = serializers.UUIDField()
    tone = serializers.ChoiceField(choices=["Professional", "Warm", "Punchy"], default="Warm")
    salt = serializers.IntegerField(default=0, min_value=0)


class UpdatePostSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    status = serializers.ChoiceField(choices=PostDraft.Status.choices, required=False)
