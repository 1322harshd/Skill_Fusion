from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .services import make_project, assess_submission
from .zip_grader import _serialize, estimate_seconds, plan_zip_review, start_zip_review, take_slot


@api_view(["POST"])
@permission_classes([AllowAny])
def project_view(request):
    a=request.data.get("a"); b=request.data.get("b")
    if not a or not b: return Response({"error":"a,b required"}, status=400)
    return Response({"project": make_project(a,b)})


MAX_ASSESS_TEXT = 20_000  # chars kept from the extracted artifact for SF
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024  # 10MB upload cap
# Everything here decodes as plain text — each project artifact type gets its
# own reader. (The generic work used to funnel into the resume extractor,
# whose .pdf/.txt-only rules + 5MB cap landed a false "upload a resume"
# error on .md/.py/.csv submissions.)
TEXT_DECODE_EXTS = {"txt", "md", "markdown", "csv", "json", "html", "htm", "xml",
                    "yaml", "yml", "js", "jsx", "ts", "tsx", "py", "css", "java",
                    "c", "cpp", "h", "sh", "sql", "r", "go", "rs", "swift", "kt",
                    "ipynb", "log", "ini", "cfg", "env", "svg"}


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


def _pdf_text(raw):
    """pypdf text lift for project submissions (mirrors the resume reader but
    speaks in project language)."""
    from io import BytesIO
    from pypdf import PdfReader
    from pypdf.errors import PdfReadError
    try:
        reader = PdfReader(BytesIO(raw))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except PdfReadError:
        raise ValueError("Couldn't read that PDF — it may be corrupted or password-protected.") from None
    return text.strip()


def _extract_artifact_text(file):
    """Returns (text, note). Text artifacts are read with project-specific
    extractors; images/zip return ("", "<visual-proof note>") — stored, not
    judged; other binaries are rejected with a user-safe message."""
    name = getattr(file, "name", "") or ""
    size = getattr(file, "size", 0) or 0
    if size > MAX_ATTACHMENT_BYTES:
        raise ValueError("Attachment too large — please keep it under 10MB.")
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""

    if ext == "pdf":
        text = _pdf_text(file.read()).strip()
        if not text:
            raise ValueError("Couldn't find readable text in that PDF — if it's a "
                             "scanned export, paste a text-based artifact or a link instead.")
        return text, ""

    if ext in TEXT_DECODE_EXTS:
        text = file.read().decode("utf-8", errors="ignore").strip()
        if not text:
            raise ValueError("That file appears to be empty — attach a written-up "
                             "artifact or paste a link instead.")
        return text, ""

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
        "That file type can't be attached — attach a document (.pdf, .txt, .md, "
        "code/JSON/CSV), an image (.png/.jpg) or a .zip, or paste a link instead.")


def _roadmap_context(fusion_id):
    """The CURRENT weekly plan for this fusion — the chosen row first, else the
    latest row — so grading judges the artifact against what the user actually
    tuned (roadmap Tweak edits persist on the row: weeks_json + constraints).
    Returns None for anon/local fusions that never persisted a roadmap."""
    from roadmaps.models import Roadmap
    if not fusion_id:
        return None
    row = (Roadmap.objects.filter(fusion_id=fusion_id, chosen=True)
           .order_by("-created_at").first()
           or Roadmap.objects.filter(fusion_id=fusion_id)
                .order_by("-created_at").first())
    if row is None:
        return None
    weeks = []
    for w in (row.weeks_json or [])[:12]:
        if not isinstance(w, dict):
            continue
        weeks.append({"week": w.get("week"), "topic": str(w.get("topic", ""))[:160],
                      "objectives": [str(o)[:160] for o in (w.get("objectives") or [])[:4]]})
    if not weeks:
        return None
    return {"plan_title": row.title, "weeks": weeks, "tweaks": (row.constraints or [])[:8]}


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
def submit_view(request):
    """Submit work for a fused project: an attachment (any document — readable
    or kept as visual proof) and/or a source link (website, Drive, repo...).
    Readable text is graded against the brief by SF; the verdict persists.

    A .zip gets the async path: the request answers immediately with
    status="grading" + a measured ETA, and zip_grader grades file-by-file
    in the background (polled via /projects/submission)."""
    fusion_id = request.data.get("fusion_id", "")
    source_link = (request.data.get("source_link") or "").strip()
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

    # Grading must judge against the plan the user is actually following:
    # the fusion-time project brief PLUS the current weekly roadmap row —
    # including any Tweak edits persisted on it. Without this, a tweak would
    # show in the plan but never influence what the grader rewards.
    try:
        rm_ctx = _roadmap_context(fusion_id)
        if rm_ctx and isinstance(brief, dict):
            brief = {**brief, "roadmap_plan": rm_ctx}
    except Exception:
        pass  # grading still proceeds on the brief alone

    filename = file_text = attachment_note = ""
    uploaded = request.FILES.get("file")
    if uploaded is not None:
        filename = uploaded.name or ""
        try:
            file_text, attachment_note = _extract_artifact_text(uploaded)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        ext_zip = filename.rsplit(".", 1)[-1].lower() == "zip" if "." in filename else False
        if ext_zip:
            plan = None
            try:
                plan = plan_zip_review(uploaded.read())
            except ValueError as e:
                return Response({"error": str(e)}, status=400)
            if plan["readable_count"] == 0:
                # No gradeable text inside — fall back to the visual-proof flow.
                attachment_note = ("Archive attached as proof — no machine-readable "
                                   "files inside. Describe the key points in your "
                                   "explanation for full assessment.")
                file_text = ""
            else:
                est = estimate_seconds(plan["readable_count"])
                note = (f"Zip review: {plan['readable_count']} readable files "
                        "being graded one by one.")
                try:
                    from .models import ProjectSubmission
                    sub = ProjectSubmission.objects.create(
                        user=getattr(request, "user", None) if request.user.is_authenticated else None,
                        fusion_ref=fusion_id,
                        filename=filename, file_text="", source_link=source_link,
                        attachment_note=note, status="grading",
                        est_seconds=est, file_digests=plan["files"],
                        brief={"brief": brief, "explanation": explanation,
                               "source_link": source_link})
                except Exception:
                    sub = None  # anon demo DB may not have the table yet
                if sub is not None:
                    est += take_slot(est)
                    start_zip_review(sub.id)
                    payload = {"submission": {
                        "id": sub.id, "filename": filename,
                        "sourceLink": source_link, "attachmentNote": note,
                        "status": "grading", "estSeconds": est,
                        "readableCount": plan["readable_count"],
                        "skipped": plan["skipped"], "async": True,
                        "verdict": None}}
                    return Response(payload, status=status.HTTP_201_CREATED)
                # Fallback: grade the whole readable text synchronously.
                file_text = "\n\n".join(f["text"] for f in plan["files"])[:MAX_ASSESS_TEXT]
        else:
            file_text = file_text[:MAX_ASSESS_TEXT]
    if not file_text and not filename and not source_link:
        return Response({"error": "Add proof — attach any document, or paste a link (website, Drive, repo…)."}, status=400)

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


@api_view(["GET"])
@permission_classes([AllowAny])
def submission_status_view(request):
    """Poll an (async) zip review: ?id=N → per-file digests (text stripped),
    aggregate verdict, status. The ExplainPanel poller lives on this."""
    sub_id = request.GET.get("id")
    sub = None
    if sub_id and str(sub_id).lstrip("-").isdigit():
        from .models import ProjectSubmission
        sub = ProjectSubmission.objects.filter(id=int(sub_id)).first()
    if sub is None:
        return Response({"error": "Submission not found."}, status=404)
    return Response({"submission": _serialize(sub)})


@api_view(["POST"])
@permission_classes([AllowAny])
def regrade_view(request):
    """Resume a dead/failed zip review: re-runs the worker for every digest
    still missing a score (text persists on failed files for exactly this)."""
    sub_id = request.data.get("id")
    if not sub_id:
        return Response({"error": "id required."}, status=400)
    from .models import ProjectSubmission
    sub = ProjectSubmission.objects.filter(id=int(sub_id)).first() if str(sub_id).lstrip("-").isdigit() else None
    if sub is None:
        return Response({"error": "Submission not found."}, status=404)
    if (sub.status or "graded") != "grading":
        est = estimate_seconds(len([d for d in (sub.file_digests or []) if isinstance(d, dict) and d.get("score") is None]))
        sub.status = "grading"
        sub.est_seconds = est
        sub.save(update_fields=["status", "est_seconds"])
        est += take_slot(est)
        start_zip_review(sub.id)
    return Response({"submission": _serialize(sub)})
