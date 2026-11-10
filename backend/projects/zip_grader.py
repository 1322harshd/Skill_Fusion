"""Async zip review: traffic-safe extraction, per-file grading queue, estimates.

Flow: submit_view hands the raw zip here -> plan_zip_review() reads it inside
hard caps (no traversal, zip-bomb guard, ≤15 readable files, ≤6k chars each,
≤60k chars total) -> the view stores the plan on ProjectSubmission and starts
one background thread per submission. The thread grades file by file on SF,
saving after every file so a dead dev server leaves a resumable row
(status "grading" + digests without scores) that regrade can pick up.

Compute reality we estimate against: one readable file (~6k chars) takes
~12s of SF time, and mlx is single-threaded — the queue is shared, so a job's
ETA includes the seconds already promised to pending jobs.
"""
import threading
import zipfile
from io import BytesIO

from .services import assess_submission  # noqa: F401 — re-exported so tests patch here

MAX_ENTRIES = 60                    # zip entries (files + dirs), incl. junk
MAX_DECOMPRESSED = 30 * 1024 * 1024  # 30MB decompression total
MAX_READABLE_FILES = 15
PER_FILE_CHARS = 6_000
TOTAL_CHARS = 60_000
SECONDS_PER_FILE = 12               # measured: ~12s SF per ≤6k-char file

# Plain-decodable artifact types only. PDFs/docx inside an archive keep their
# own extractor needs — those stay listing as not-machine-readable for now.
READABLE_EXTS = {"txt", "md", "markdown", "csv", "json", "html", "htm", "xml",
                 "yaml", "yml", "js", "jsx", "ts", "tsx", "py", "css", "java",
                 "c", "cpp", "h", "sh", "sql", "r", "go", "rs", "swift", "kt",
                 "ipynb", "log", "ini", "cfg", "env", "svg", "toml",
                 "tex", "rtf", "srt", "vtt", "conf"}

# background queue accounting (mlx = one grade at a time across the app)
_LOCK = threading.Lock()
_PENDING_SECONDS = 0.0


def _ext(name):
    base = name.rsplit("/", 1)[-1]
    return base.rsplit(".", 1)[-1].lower() if "." in base else ""


def plan_zip_review(zip_bytes):
    """Return a review plan dict, or raise ValueError with a user-safe message.

    plan: {files: [{name, ext, chars, text}], skipped: [{name, reason}],
           readable_count, total_chars, base_seconds}
    `files` carries the staged text inside — it lives only in the DB row
    (file_digests), never in API responses."""
    if not zip_bytes:
        raise ValueError("That zip is empty.")
    try:
        zf = zipfile.ZipFile(BytesIO(zip_bytes))
        infos = zf.infolist()
    except zipfile.BadZipFile:
        raise ValueError("That file isn't a readable zip archive — re-pack it "
                         "(right-click folder → Compress) and try again.") from None

    files, skipped = [], []
    total_chars = 0
    if len(infos) > MAX_ENTRIES:
        raise ValueError(f"That archive holds {len(infos)} entries — the review "
                         f"handles up to {MAX_ENTRIES}. Split it or trim the extras.")
    for info in infos:
        name = (info.filename or "").strip()
        if not name or name.endswith("/"):
            continue  # directory entries
        clean = name.lstrip("/")
        if name.startswith("/") or name.startswith("\\") or ".." in clean.split("/"):
            skipped.append({"name": name, "reason": "unsafe path — skipped"})
            continue
        if clean.startswith("__MACOSX/") or clean.split("/")[-1].startswith("."):
            skipped.append({"name": name, "reason": "system/junk file"})
            continue
        ext = _ext(clean)
        if ext not in READABLE_EXTS:
            skipped.append({"name": name, "reason": f".{ext or 'no extension'} files aren't machine-readable"})
            continue
        if len(files) >= MAX_READABLE_FILES:
            skipped.append({"name": name, "reason": f"review caps at {MAX_READABLE_FILES} readable files"})
            continue
        decompressed = zf.read(info)
        total_read = sum(len(f.get("text") or "") for f in files) + len(decompressed)
        if total_read > MAX_DECOMPRESSED:
            raise ValueError("That archive decompresses to over 30MB — too heavy to review in place.")
        text = decompressed.decode("utf-8", errors="ignore").strip()
        if not text:
            skipped.append({"name": name, "reason": "empty or no readable text"})
            continue
        budget = min(PER_FILE_CHARS, TOTAL_CHARS - total_chars)
        if budget <= 0:
            skipped.append({"name": name, "reason": "grade budget full — regrade will pick it up"})
            continue
        files.append({"name": clean, "ext": ext, "chars": min(len(text), budget),
                      "text": text[:budget]})
        total_chars += min(len(text), budget)

    base_seconds = max(SECONDS_PER_FILE, len(files) * SECONDS_PER_FILE)
    return {"files": files, "skipped": skipped, "readable_count": len(files),
            "total_chars": total_chars, "base_seconds": base_seconds}


def estimate_seconds(readable_count):
    """Own-job SF seconds; submit adds the pending queue on top.
    Measured reality: ~12s per ≤6k-char readable file, SF single-threaded."""
    return max(SECONDS_PER_FILE, readable_count * SECONDS_PER_FILE)


def take_slot(est_seconds):
    """Reserve queue seconds for one job; returns seconds must wait (others)."""
    global _PENDING_SECONDS
    with _LOCK:
        wait = int(_PENDING_SECONDS)
        _PENDING_SECONDS += est_seconds
        return wait


def release_slot(est_seconds):
    global _PENDING_SECONDS
    with _LOCK:
        _PENDING_SECONDS = max(0.0, _PENDING_SECONDS - est_seconds)


def pending_seconds():
    with _LOCK:
        return int(_PENDING_SECONDS)


# ---- background worker -----------------------------------------------------

def _aggregate(files_scored):
    """Chars-weighted mean score; closeness bands like assess_submission."""
    weight_total, weighted, closeness = 0, 0, "weak"
    for d in files_scored:
        if d.get("score") is None:
            continue
        chars = max(int(d.get("chars") or 1), 1)
        weighted += d["score"] * chars
        weight_total += chars
    if weight_total:
        score = round(weighted / weight_total)
        closeness = "weak" if score < 35 else "partial" if score < 75 else "strong"
        verdict = (f"Aggregate of {len(files_scored)} files scored file-by-file: "
                   f"{score}/100 ({closeness}). Per-file scores below.")
        return score, closeness, verdict
    return None, "weak", "Assessment couldn't run — SF unreachable. Submission saved."


def _grade_files(sub_id):
    """Worker thread: grade every pending digest on SF, save() after each file,
    then persist the chars-weighted aggregate verdict. Failures keep the file's
    text on the row so regrade can resume exactly where it stopped."""
    from .models import ProjectSubmission

    sub = ProjectSubmission.objects.filter(id=sub_id).first()
    if sub is None:
        return
    est = getattr(sub, "est_seconds", None) or 0
    payload = sub.brief if isinstance(sub.brief, dict) else {}
    brief = payload.get("brief") or {}
    explanation = payload.get("explanation") or ""
    source_link = payload.get("source_link") or ""
    digests = sub.file_digests if isinstance(sub.file_digests, list) else []
    try:
        for d in digests:
            if not isinstance(d, dict) or d.get("score") is not None or "text" not in d:
                continue  # already graded, or a resumable stub without text
            try:
                verdict = assess_submission(brief, explanation, d.get("text") or "",
                                            source_link)
                d["score"] = verdict.get("matchScore")
                d["closeness"] = verdict.get("closeness")
                d["strengths"] = verdict.get("strengths") or []
                d["gaps"] = verdict.get("gaps") or []
                d["note"] = ""
                d.pop("text", None)  # keep rows light once a file is graded
            except Exception:
                d["score"] = None
                d["note"] = "assessment failed — retry with Re-grade"
            sub.file_digests = digests
            sub.save(update_fields=["file_digests"])
        files_scored = [d for d in digests if isinstance(d, dict) and d.get("score") is not None]
        score, closeness, verdict = _aggregate(files_scored)
        strengths_all, gaps_all = [], []
        for d in files_scored:
            for s in d.get("strengths") or []:
                if s not in strengths_all:
                    strengths_all.append(s)
            for g in d.get("gaps") or []:
                if g not in gaps_all:
                    gaps_all.append(g)
        sub.verdict = {"matchScore": score, "closeness": closeness,
                       "strengths": strengths_all[:4], "gaps": gaps_all[:4],
                       "verdict": verdict}
        sub.match_score = score
        sub.status = "failed" if score is None else "graded"
        sub.save(update_fields=["verdict", "match_score", "status"])
    except Exception:
        sub.status = "failed"
        sub.save(update_fields=["status"])
    finally:
        release_slot(est)


def start_zip_review(sub_id):
    threading.Thread(target=_grade_files, args=(sub_id,), daemon=True).start()


def _serialize(sub):
    """API view of a submission — file text and brief internals stripped."""
    files = sorted((d for d in (sub.file_digests or []) if isinstance(d, dict)),
                   key=lambda d: (d.get("score") is None, -(d.get("chars") or 0)))
    files = [{k: v for k, v in d.items() if k != "text"} for d in files]
    return {"id": sub.id, "filename": sub.filename, "sourceLink": sub.source_link,
            "attachmentNote": sub.attachment_note,
            "status": sub.status or "graded", "estSeconds": sub.est_seconds,
            "verdict": sub.verdict, "matchScore": sub.match_score,
            "files": files, "brief": (sub.brief or {}).get("brief") or {}}
