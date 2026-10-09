from django.http import HttpResponse
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .llm import LlmError, generate_resume_content
from .models import ResumeDocument
from .pdf import render_pdf
from .prompts import build_user_prompt
from .serializers import GenerateResumeSerializer, ResumeDocumentSerializer


class GenerateResumeView(APIView):
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


class ResumeDocumentListView(APIView):
    def get(self, request):
        documents = ResumeDocument.objects.filter(user=request.user)
        return Response(ResumeDocumentSerializer(documents, many=True).data)


class ResumeExportView(APIView):
    def get(self, request, document_id):
        document = get_object_or_404(ResumeDocument, documentId=document_id, user=request.user)
        doc_type = request.query_params.get("doc", "resume")

        if doc_type == "cover":
            pdf_bytes = render_pdf(f"Cover Letter — {request.user.fullName}", [document.coverLetter])
            filename = "cover-letter.pdf"
        else:
            paragraphs = [document.resumeSummary] + [f"• {b}" for b in document.resumeBullets]
            pdf_bytes = render_pdf(f"Resume — {request.user.fullName}", paragraphs)
            filename = "resume.pdf"

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
