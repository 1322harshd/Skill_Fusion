from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .services import make_project, assess_submission


@api_view(["POST"])
@permission_classes([AllowAny])
def project_view(request):
    a=request.data.get("a"); b=request.data.get("b")
    if not a or not b: return Response({"error":"a,b required"}, status=400)
    return Response({"project": make_project(a,b)})


MAX_ASSESS_TEXT = 20_000  # chars kept from the extracted artifact for SF

def _extract_artifact_text(file):
    """Text extraction for .pdf/.txt/.md only — everything else is rejected
    with a user-safe message (no silent binary decode)."""
    from resume.extract import extract_text, ExtractionError
    name = getattr(file, "name", "") or ""
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in ("pdf", "txt", "md"):
        raise ValueError("Please upload .pdf, .txt or .md work — or add a source link.")
    try:
        return extract_text(file)
    except ExtractionError as e:
        raise ValueError(str(e)) from e


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
def submit_view(request):
    """Submit work for a fused project: artifact file and/or source link.
    Extracts text, asks SF to grade it against the brief, persists the
    verdict, returns the assessment for the UI."""
    fusion_id = request.data.get("fusion_id", "")
    filename = file_text = ""
    uploaded = request.FILES.get("file")
    if uploaded is not None:
        filename = uploaded.name or ""
        try:
            file_text = _extract_artifact_text(uploaded)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        file_text = file_text[:MAX_ASSESS_TEXT]
    source_link = (request.data.get("source_link") or "").strip()
    if not file_text and not source_link:
        return Response({"error": "Attach a file (.pdf/.txt/.md) or add a source link."}, status=400)

    explanation = (request.data.get("explanation") or "").strip()
    brief = request.data.get("brief")
    if isinstance(brief, str):
        try: import json as _j; brief = _j.loads(brief)
        except Exception: brief = {}
    if not isinstance(brief, dict): brief = {}

    if not brief:
        try:
            from fusion_engine.models import Fusion
            row = Fusion.objects.filter(id=fusion_id).first()
            if row is not None: brief = row.project or {}
        except Exception:
            brief = {}

    verdict = {"matchScore": None, "closeness": "weak",
               "strengths": [], "gaps": [], "verdict": "Assessment couldn't run — SF unreachable. Submission saved."}
    try:
        verdict = assess_submission(brief, explanation, file_text or "(no artifact text — link submission)",
                                    source_link)
    except Exception:
        pass  # fail-open: persist submission, flag assessment failed

    try:
        from .models import ProjectSubmission
        sub = ProjectSubmission.objects.create(
            user=getattr(request, "user", None) if request.user.is_authenticated else None,
            fusion_ref=fusion_id,
            filename=filename, file_text=file_text, source_link=source_link,
            verdict=verdict, match_score=verdict.get("matchScore"))
    except Exception:
        sub = None  # anon demo DBs may not have the table yet — still assess

    return Response({"submission": {
        "id": getattr(sub, "id", None), "filename": filename,
        "sourceLink": source_link,
        "verdict": verdict}}, status=status.HTTP_201_CREATED)
