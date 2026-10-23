from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .services import get_previews, tweak_roadmap
from .models import Roadmap

def _is_owner(fid, request):
    """True when fusion is anon-owned (landing demo) or belongs to caller."""
    from fusion_engine.models import Fusion
    if not fid: return True
    fusion = Fusion.objects.filter(id=fid).select_related("user").first()
    if fusion is None or fusion.user is None: return True
    return request.user.is_authenticated and fusion.user == request.user

def _fusion_for(fusion_payload, request):
    """Fetch the Fusion row for a payload like {a,b,...}, enforcing ownership
    when the fusion belongs to a logged-in user (anon-demo fusions stay open)."""
    from fusion_engine.models import Fusion
    fid = (fusion_payload or {}).get("id") or (fusion_payload or {}).get("fusion_id")
    if not _is_owner(fid, request):
        raise PermissionDenied("not your fusion")
    if not fid: return None
    return Fusion.objects.filter(id=fid).first()

def _persist_previews(fusion_payload, previews, request):
    """Each preview becomes a Roadmap row (unlocked, unchosen). Re-running the
    same salt re-links the existing row for a title instead of duplicating it.
    Un-persisted fusions (anon landing demo, local-mock ids) get nothing."""
    fusion = _fusion_for(fusion_payload, request)
    fid = (fusion_payload or {}).get("id") or ""
    existing = set(Roadmap.objects.filter(fusion_id=fid).values_list("title", flat=True)) if fusion else set()
    ids = []
    for p in previews:
        detail = p.get("roadmap") or {}
        rid = None
        if fusion:
            if p.get("title") in existing:
                rm = Roadmap.objects.filter(fusion_id=fid, title=p["title"]).first()
            else:
                rm = Roadmap.objects.create(
                    fusion_id=fid, title=p.get("title", "")[:300],
                    weeks_json=detail.get("weeks", []),
                    outcome_statement=detail.get("outcome_statement", ""))
                existing.add(p.get("title"))
            rid = rm.id
        ids.append(rid)
    out = []
    for p, rid in zip(previews, ids):
        if rid: p = {**p, "roadmap_id": rid}
        out.append(p)
    return out

@api_view(["POST"])
@permission_classes([AllowAny])
def previews_view(request):
    fusion = request.data.get("fusion")
    salt = request.data.get("salt",0)
    if not fusion: return Response({"error":"fusion required"}, status=400)
    try:
        previews = get_previews(fusion, salt)
    except PermissionDenied:
        raise
    except Exception as e:
        return Response({"error": f"SF unreachable: {str(e)[:120]}"}, status=502)
    return Response({"previews": _persist_previews(fusion, previews, request)})

@api_view(["POST"])
@permission_classes([AllowAny])
def choose_view(request):
    rid = request.data.get("roadmap_id")
    if rid:
        rm = Roadmap.objects.filter(id=rid).first()
        if rm and not _is_owner(rm.fusion_id, request):
            raise PermissionDenied("not your fusion")
        if rm:
            rm.chosen = True
            rm.locked = True  # frozen: further tweaks rejected, only regenerate
            rm.save(update_fields=["chosen", "locked"])
            return Response({"ok": True, "locked": True})
    return Response({"ok":True})


@api_view(["POST"])
@permission_classes([AllowAny])
def progress_view(request):
    """Persist check-off progress on a persisted roadmap row. Only ever moves
    forward (the sweep clamps to the row's own week count)."""
    rm = Roadmap.objects.filter(id=request.data.get("roadmap_id")).first()
    if not rm:
        return Response({"error": "roadmap_id required"}, status=400)
    if not _is_owner(rm.fusion_id, request):
        raise PermissionDenied("not your fusion")
    try:
        target = int(request.data.get("progress_weeks", rm.progress_weeks))
    except (TypeError, ValueError):
        return Response({"error": "progress_weeks must be an integer"}, status=400)
    rm.progress_weeks = max(rm.progress_weeks, min(target, len(rm.weeks_json)))
    rm.save(update_fields=["progress_weeks"])
    return Response({"roadmap_id": rm.id, "progress_weeks": rm.progress_weeks})


@api_view(["GET"])
@permission_classes([AllowAny])
def chosen_view(request):
    """The persisted+chosen roadmap for a fusion, so a signed-in user's
    chosen path (and its progress) survive a page reload."""
    fid = request.query_params.get("fusion_id", "")
    row = (Roadmap.objects.filter(fusion_id=fid, chosen=True)
           .order_by("-progress_weeks", "-created_at").first())
    if not row:
        return Response({"roadmap": None})
    if not _is_owner(fid, request):
        raise PermissionDenied("not your fusion")
    return Response({"roadmap": {
        "roadmap_id": row.id,
        "title": row.title,
        "weeks": [{"week": w.get("week"), "topic": w.get("topic"),
                   "objectives": w.get("objectives", [])} for w in row.weeks_json],
        "outcome_statement": row.outcome_statement,
        "constraints": row.constraints,
        "progress_weeks": row.progress_weeks,
        "locked": row.locked,
    }})


@api_view(["POST"])
@permission_classes([AllowAny])
def tweak_view(request):
    """Pre-commit tweak: locked roadmaps reject; else skill-presence test + diff."""
    rm = Roadmap.objects.filter(id=request.data.get("roadmap_id")).first()
    if rm and not _is_owner(rm.fusion_id, request):
        raise PermissionDenied("not your fusion")
    if rm and rm.locked:
        return Response({"error": "roadmap locked — regenerate for a fresh set"}, status=423)
    title = request.data.get("title", rm.title if rm else "")
    weeks = request.data.get("weeks", rm.weeks_json if rm else [])
    outcome = request.data.get("outcome_statement", rm.outcome_statement if rm else "")
    skill_a = request.data.get("skill_a", "")
    skill_b = request.data.get("skill_b", "")
    constraints = list(request.data.get("existing_constraints", []))
    if rm:
        constraints = list(dict.fromkeys(list(rm.constraints) + constraints))
    new_request = request.data.get("new_request", "")
    if not new_request:
        return Response({"error": "new_request required"}, status=400)
    record = {"title": title, "weeks": weeks, "outcome_statement": outcome}
    try:
        result = tweak_roadmap(record, constraints, skill_a, skill_b, new_request)
    except Exception as e:
        return Response({"error": f"SF unreachable: {str(e)[:120]}"}, status=502)
    if result.get("classification") == "acceptable":
        constraints = constraints + [new_request]
        if rm:
            rm.constraints = constraints
            rm.save(update_fields=["constraints"])
    return Response({**result, "updated_constraints": constraints})

@api_view(["POST"])
@permission_classes([AllowAny])
def regenerate_view(request):
    fusion = request.data.get("fusion")
    salt = request.data.get("salt",0)
    next_salt = (salt or 0)+1
    try:
        previews = get_previews(fusion, next_salt)
    except PermissionDenied:
        raise
    except Exception as e:
        return Response({"error": f"SF unreachable: {str(e)[:120]}"}, status=502)
    return Response({"salt": next_salt, "previews": _persist_previews(fusion, previews, request)})
