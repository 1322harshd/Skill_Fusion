from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .services import make_brief, make_oracle, fallback_oracle
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
    brief = asyncio.run(make_brief([a, b], score))
    # NOTE: roadmap comes from /api/roadmap/previews/ (SF-wired), NOT bundled
    # here — the old hash-template make_roadmap was removed rather than shipped.
    project = __import__("projects.services", fromlist=["make_project"]).make_project([a, b])
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
        "addedSkills": r.added_skills, "lineageFrom": r.lineage_from,
        "createdAt": r.created_at.isoformat(),
    } for r in rows]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_skill_view(request):
    """Re-fusion ("Add third skill -> graduate to the trio"). NEVER mutates the
    pair fusion: a brand-new trio row is created (fresh trio-flavored brief,
    project, and a from-scratch trio score), while the old pair keeps its
    roadmap progress, project brief, and submissions untouched."""
    from .models import Fusion
    import asyncio
    from scores.services import make_score_sync_n
    from projects.services import make_project

    fusion_id = request.data.get("fusion_id", "")
    skill = request.data.get("skill", "").strip()
    if not fusion_id:
        return Response({"error": "fusion_id required"}, status=400)
    if not skill:
        return Response({"error": "skill required"}, status=400)

    try:
        old = Fusion.objects.get(id=fusion_id, user=request.user)
    except Fusion.DoesNotExist:
        return Response({"error": "Fusion not found"}, status=404)

    if old.added_skills:
        return Response({"error": "This fusion is already a trio."}, status=400)
    if skill.lower() in (old.a.lower(), old.b.lower()) or \
            any(skill.lower() == s.lower() for s in old.added_skills):
        return Response({"error": "That skill is already in this fusion."}, status=400)

    a, b = old.a, old.b
    trio = [a, b, skill]
    score = make_score_sync_n(trio)
    brief = asyncio.run(make_brief(trio, score))
    project = make_project(trio)
    tid = f"f{hash('×'.join(trio))}-u{request.user.pk}"
    try:
        row = Fusion.objects.update_or_create(
            id=tid,
            defaults={"user": request.user, "a": a, "b": b,
                      "category_a": category_of(a), "category_b": category_of(b),
                      "score": score, "brief": brief, "project": project,
                      "added_skills": [skill], "lineage_from": old.id})[0]
        created_at = row.created_at.isoformat()
    except Exception:
        # persistence is best-effort, same contract as fuse_view — but for the
        # client to render the trio (creature third part, quiz link, roadmap
        # picker default) we hand the computed values back regardless.
        created_at = None
    return Response({
        "fusion": {
            "id": tid, "a": a, "b": b,
            "categoryA": category_of(a), "categoryB": category_of(b),
            "score": score, "brief": brief, "project": project,
            "addedSkills": [skill],
            # "old-id" drives the creature's "evolved from X × Y" lineage note
            "lineageFrom": old.id,
            "createdAt": created_at,
        }})

@api_view(["POST"])
@permission_classes([AllowAny])
def oracle_view(request):
    """The Fusion Oracle: a skeptic/oracle self-debate on a candidate pair,
    shown BEFORE the learner commits to fusing. One SF call; deterministic
    fallback debate when SF is unreachable (never dead-ends, always renders)."""
    a = request.data.get("a", "").strip()
    b = request.data.get("b", "").strip()
    if not a or not b:
        return Response({"error": "a and b required"}, status=400)
    import asyncio
    try:
        oracle = asyncio.run(make_oracle(a, b))
        source = "sf"
    except Exception:
        # make_oracle already catches internally; this guard exists for
        # anything unforeseen (import cycles, asyncio teardown, etc.)
        oracle = fallback_oracle(a, b)
        source = "fallback"
    return Response({"oracle": oracle, "source": source})

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
