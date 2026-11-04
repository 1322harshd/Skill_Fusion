from rest_framework import serializers

from .models import ResumeDocument, ResumeUpload


class ResumeUploadSerializer(serializers.ModelSerializer):
    """Read-only metadata about the learner's uploaded resume (not the extracted text itself)."""

    class Meta:
        model = ResumeUpload
        fields = ["filename", "uploadedAt"]
        read_only_fields = fields


class UploadResumeSerializer(serializers.Serializer):
    """Input for the upload endpoint: just the raw file."""

    file = serializers.FileField()


class ResumeDocumentSerializer(serializers.ModelSerializer):
    """Read-only view of a generated resume document — all fields are server-written."""

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
    """Input for the generate endpoint: an optional job listing to tailor the resume to."""

    jobListing = serializers.CharField(required=False, allow_blank=True, default="")
