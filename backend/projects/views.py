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
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024  # 10MB upload cap
TEXT_EXTS = {"pdf", "txt", "md", "csv", "json", "html", "xml", "yaml", "yml",
             "js", "jsx", "ts", "tsx", "py", "css", "java", "c", "cpp", "h", "sh", "sql"}


def _docx_text(raw):
    """Minimal .docx text lift: word/document.xml, tags stripped, newlines kept."""
    import re, zipfile
    from io import BytesIO
    with zipfile.ZipFile(BytesIO(raw)) as z:
        xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
    if not xml:
        raise ValueError("Couldn't find readable text in that .docx.")
    xml = re.sub(r"<w:p[ >]", "\n<w:p ", xml)
    return re.sub(r"<[^>]+>", "", xml)


def _extract_artifact_text(file):
    """Returns (text, note). Text-readable docs return (text, ""); images/zip
    return ("", "<visual-proof note>") — stored, not judged; other binaries
    are rejected with a user-safe message."""
    from resume.extract import extract_text, ExtractionError
    name = getattr(file, "name", "") or ""
    size = getattr(file, "size", 0) or 0
    if size > MAX_ATTACHMENT_BYTES:
        raise ValueError("Attachment too large — please keep it under 10MB.")
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""

    if ext in TEXT_EXTS:
        try:
            return extract_text(file), ""
        except ExtractionError as e:
            raise ValueError(str(e)) from e

    if ext == "docx":
        raw = file.read()
        try:
            text = _docx_text(raw).strip()
        except Exception as e:
            raise ValueError("Couldn't read that .docx — try exporting to PDF.") from e
        if not text:
            raise ValueError("No text found in that .docx — try a PDF instead.")
        return text, ""

    # Images/zip: keep as visual proof; assessment runs without their text.
    human = {"png": "image", "jpg": "image", "jpeg": "image", "webp": "image",
             "gif": "image", "bmp": "image", "tif": "image", "tiff": "image",
             "heic": "image", "zip": "archive"}
    if ext in human:
        kind = human[ext]
        return "", (f"{kind.capitalize()} attached as proof — not machine-read. "
                    "Describe the key points in your explanation for full assessment.")

    # Anything else is an unknown binary — don't silently store junk.
    raise ValueError(
        "That file type can't be attached — attach a document (.pdf, .docx, .txt, "
        "code/JSON/CSV), an image (.png/.jpg) or a .zip, or paste a link instead.")


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
def submit_view(request):
    """Submit work for a fused project: an attachment (any document — readable
    or kept as visual proof) and/or a source link (website, Drive, repo...).
    Readable text is graded against the brief by SF; the verdict persists."""
    fusion_id = request.data.get("fusion_id", "")
    filename = file_text = attachment_note = ""
    uploaded = request.FILES.get("file")
    if uploaded is not None:
        filename = uploaded.name or ""
        try:
            file_text, attachment_note = _extract_artifact_text(uploaded)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        file_text = file_text[:MAX_ASSESS_TEXT]
    source_link = (request.data.get("source_link") or "").strip()
    if not file_text and not filename and not source_link:
        return Response({"error": "Add proof — attach any document, or paste a link (website, Drive, repo…)."}, status=400)

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
            attachment_note=attachment_note,
            verdict=verdict, match_score=verdict.get("matchScore"))
    except Exception:
        sub = None  # anon demo DBs may not have the table yet — still assess

    return Response({"submission": {
        "id": getattr(sub, "id", None), "filename": filename,
        "sourceLink": source_link, "attachmentNote": attachment_note,
        "verdict": verdict}}, status=status.HTTP_201_CREATED)
