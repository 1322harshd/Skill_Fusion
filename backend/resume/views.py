from django.http import HttpResponse
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .extract import ExtractionError, extract_text
from .llm import LlmError, generate_resume_content
from .models import ResumeDocument, ResumeUpload
from .pdf import render_pdf, render_pdf_from_layout
from .prompts import build_user_prompt
from .serializers import (
    GenerateResumeSerializer,
    ResumeDocumentSerializer,
    ResumeLayoutSerializer,
    ResumeUploadSerializer,
    UploadResumeSerializer,
)


class GenerateResumeView(APIView):
    """Generate a new tailored resume + cover letter from the user's Growth Log evidence
    (and uploaded resume, if any). Rate-limited since each call is an LLM request."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "resume-generate"

    def post(self, request):
        serializer = GenerateResumeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job_listing = serializer.validated_data["jobListing"]

        user_prompt = build_user_prompt(request.user, job_listing)
        try:
            content = generate_resume_content(user_prompt)
        except LlmError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        document = ResumeDocument.objects.create(
            user=request.user,
            jobListing=job_listing,
            resumeSummary=content["resumeSummary"],
            resumeBullets=content["resumeBullets"],
            coverLetter=content["coverLetter"],
        )
        return Response(ResumeDocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class ResumeUploadView(APIView):
    """View, replace, or remove the learner's uploaded base resume."""

    def get(self, request):
        upload = ResumeUpload.objects.filter(user=request.user).first()
        if not upload:
            return Response({"filename": None, "uploadedAt": None})
        return Response(ResumeUploadSerializer(upload).data)

    def post(self, request):
        serializer = UploadResumeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_file = serializer.validated_data["file"]

        try:
            text = extract_text(uploaded_file)
        except ExtractionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Each user has at most one resume upload — a new upload replaces the old one.
        upload, _ = ResumeUpload.objects.update_or_create(
            user=request.user,
            defaults={"filename": uploaded_file.name, "extractedText": text},
        )
        return Response(ResumeUploadSerializer(upload).data, status=status.HTTP_201_CREATED)

    def delete(self, request):
        ResumeUpload.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResumeDocumentListView(APIView):
    """List all previously generated resume documents for the current user."""

    def get(self, request):
        documents = ResumeDocument.objects.filter(user=request.user)
        return Response(ResumeDocumentSerializer(documents, many=True).data)


class ResumeLayoutView(APIView):
    """Save canvas-editor state (block positions/sizes/content) for a
    generated document."""

    def patch(self, request, document_id):
        document = get_object_or_404(ResumeDocument, documentId=document_id, user=request.user)
        serializer = ResumeLayoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document.layout = serializer.validated_data["layout"]
        document.save(update_fields=["layout"])
        return Response(ResumeDocumentSerializer(document).data)


class ResumeExportView(APIView):
    """Render a generated document to a downloadable PDF — either the resume or the cover
    letter, chosen via the `doc` query param."""

    def get(self, request, document_id):
        document = get_object_or_404(ResumeDocument, documentId=document_id, user=request.user)
        doc_type = request.query_params.get("doc", "resume")

        if doc_type == "cover":
            pdf_bytes = render_pdf(f"Cover Letter — {request.user.fullName}", [document.coverLetter])
            filename = "cover-letter.pdf"
        else:
            # A custom layout (from the canvas editor) renders at its own
            # positions; otherwise fall back to the plain paragraph flow —
            # this keeps old documents (and anything with no layout set)
            # exporting exactly as they did before this feature existed.
            if document.layout and document.layout.get("blocks"):
                pdf_bytes = render_pdf_from_layout(document.layout)
            else:
                paragraphs = [document.resumeSummary] + [f"• {b}" for b in document.resumeBullets]
                pdf_bytes = render_pdf(f"Resume — {request.user.fullName}", paragraphs)
            filename = "resume.pdf"

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
