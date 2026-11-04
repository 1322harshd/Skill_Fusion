from rest_framework import serializers

from .models import Credential, GrowthLogEntry


class CredentialSerializer(serializers.ModelSerializer):
    """Read-only view of a credential — verification fields are set by the server, not the client."""

    class Meta:
        model = Credential
        fields = ["credentialId", "issuer", "verificationUrl", "verificationStatus", "requestedAt", "verifiedAt"]
        read_only_fields = ["credentialId", "verificationStatus", "requestedAt", "verifiedAt"]


class GrowthLogEntrySerializer(serializers.ModelSerializer):
    credential = CredentialSerializer(read_only=True)

    class Meta:
        model = GrowthLogEntry
        fields = [
            "entryId",
            "source",
            "title",
            "description",
            "sourceUrl",
            "skillTags",
            "competencyTags",
            "verified",
            "isPrivate",
            "loggedAt",
            "credential",
        ]
        read_only_fields = ["entryId", "source", "verified", "isPrivate", "loggedAt", "credential"]


class CreateEntrySerializer(serializers.ModelSerializer):
    """Input serializer for manually-created entries; forces source to MANUAL and owner to the caller."""

    class Meta:
        model = GrowthLogEntry
        fields = ["title", "description", "sourceUrl", "skillTags", "competencyTags"]

    def create(self, validated_data):
        return GrowthLogEntry.objects.create(
            user=self.context["request"].user,
            source=GrowthLogEntry.Source.MANUAL,
            **validated_data,
        )


class VerifyCredentialSerializer(serializers.Serializer):
    # max_length matches the Credential model fields — without it, DRF lets an
    # oversized value through validation and it crashes at the DB insert instead
    # of failing cleanly with a 400.
    verificationUrl = serializers.URLField(max_length=200)
    issuer = serializers.CharField(required=False, allow_blank=True, default="", max_length=200)
