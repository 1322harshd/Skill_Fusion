from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .services import get_previews, tweak_roadmap
from .models import Roadmap

@api_view(["POST"])
@permission_classes([AllowAny])
def previews_view(request):
    fusion = request.data.get("fusion")
    salt = request.data.get("salt",0)
    if not fusion: return Response({"error":"fusion required"}, status=400)
    return Response({"previews": get_previews(fusion, salt)})

@api_view(["POST"])
@permission_classes([AllowAny])
def choose_view(request):
    rid = request.data.get("roadmap_id")
    if rid:
        try:
            rm = Roadmap.objects.get(id=rid)
            rm.chosen = True
            rm.locked = True  # frozen: further tweaks rejected, only regenerate
            rm.save(update_fields=["chosen", "locked"])
            return Response({"ok": True, "locked": True})
        except Roadmap.DoesNotExist:
            pass
    return Response({"ok":True})


@api_view(["POST"])
@permission_classes([AllowAny])
def tweak_view(request):
    """Pre-commit tweak: locked roadmaps reject; else skill-presence test + diff."""
    rm = Roadmap.objects.filter(id=request.data.get("roadmap_id")).first()
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
    return Response({"salt": next_salt, "previews": get_previews(fusion, next_salt)})
