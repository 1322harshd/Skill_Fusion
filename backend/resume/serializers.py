from rest_framework import serializers

from .models import ResumeDocument


class ResumeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeDocument
        fields = [
            "documentId",
            "jobListing",
            "resumeSummary",
            "resumeBullets",
            "coverLetter",
            "createdAt",
        ]
        read_only_fields = fields


class GenerateResumeSerializer(serializers.Serializer):
    jobListing = serializers.CharField(required=False, allow_blank=True, default="")
