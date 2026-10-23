from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .services import make_brief
from .quiz import generate_quiz, score_quiz
from .evidence import judge_skills_from_resume
from .categories import category_of
from scores.services import make_score

def hash(s):
    h=0
    for ch in str(s): h=(h*31+ord(ch)) & 0xFFFFFFFF
    return abs(h)

@api_view(["POST"])
@permission_classes([AllowAny])
def fuse_view(request):
    a=request.data.get("a","").strip()
    b=request.data.get("b","").strip()
    if not a or not b: return Response({"error":"a and b required"}, status=400)
    # score: real job-data when listings exist, else labeled heuristic.
    # brief: SF-first via make_brief (falls back to curated template on error).
    import asyncio
    from scores.services import make_score_sync
    try:
        score = asyncio.run(make_score(a, b))
    except Exception:
        score = make_score_sync(a,b)
        score["source"] = "heuristic"
    brief = asyncio.run(make_brief(a,b,score))
    # NOTE: roadmap comes from /api/roadmap/previews/ (SF-wired), NOT bundled
    # here — the old hash-template make_roadmap was removed rather than shipped.
    project = __import__("projects.services", fromlist=["make_project"]).make_project(a,b)
    fid = f"f{hash(a+'×'+b)}"
    # Persist when the caller is authenticated (landing demo keeps working
    # anonymously). ids are namespaced per user: Fusion.id is the primary key
    # and pair-derived, so two users fusing the same pair must not collide on
    # it — same ancestor pair id as the roadmap rows key off.
    user = request.user if request.user.is_authenticated else None
    if user is not None:
        fid = f"{fid}-u{user.pk}"
        try:
            from .models import Fusion
            Fusion.objects.update_or_create(
                id=fid,
                defaults={"user": user, "a": a, "b": b,
                          "category_a": category_of(a), "category_b": category_of(b),
                          "score": score, "brief": brief, "project": project})
        except Exception:
            pass  # persistence is best-effort: never block the fuse response on it
    return Response({"fusion": {"id":fid, "a":a,"b":b,"score":score,"brief":brief,"project":project}})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fusion_history_view(request):
    """Caller's persisted fusions, newest first. Drives Fuse-page history and
    keeps Roadmaps/Dashboard fed after a fresh login."""
    from .models import Fusion
    rows = Fusion.objects.filter(user=request.user)[:50]
    return Response({"fusions": [{
        "id": r.id, "a": r.a, "b": r.b,
        "categoryA": r.category_a, "categoryB": r.category_b,
        "score": r.score, "brief": r.brief, "project": r.project,
        "createdAt": r.created_at.isoformat(),
    } for r in rows]})

@api_view(["POST"])
@permission_classes([AllowAny])
def quiz_generate(request):
    skills=request.data.get("skills", ["Design","Code"])
    # Anon (landing demo) allowed; logged-in sessions get owner-tagged.
    if request.user.is_authenticated:
        return Response(generate_quiz(skills, user=request.user))
    return Response(generate_quiz(skills))

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def skills_known_view(request):
    """POST {skills: [a, b]} -> per-skill verdict from the uploaded resume:
    {known, level (1-10 or null), source, reason}. Quiz only what's unknown."""
    skills = [str(s)[:40] for s in (request.data.get("skills") or [])][:4]
    if not skills:
        return Response({"error": "skills required"}, status=400)
    return Response({"verdicts": judge_skills_from_resume(request.user, skills)})

@api_view(["POST"])
@permission_classes([AllowAny])
def quiz_submit(request):
    answers=request.data.get("answers", [])
    session_id=request.data.get("session_id")
    if not session_id: return Response({"error":"session_id required"}, status=400)
    return Response({"levels": score_quiz(session_id, answers)})
