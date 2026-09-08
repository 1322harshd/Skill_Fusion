from rest_framework import serializers

from .models import Credential, GrowthLogEntry


class CredentialSerializer(serializers.ModelSerializer):
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
            "loggedAt",
            "credential",
        ]
        read_only_fields = ["entryId", "source", "verified", "loggedAt", "credential"]


class CreateEntrySerializer(serializers.ModelSerializer):
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
    verificationUrl = serializers.URLField()
    issuer = serializers.CharField(required=False, allow_blank=True, default="")
