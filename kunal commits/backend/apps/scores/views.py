from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .services import make_score, make_score_sync
@api_view(["POST"])
@permission_classes([AllowAny])
def score_view(request):
    a=request.data.get("a"); b=request.data.get("b")
    if not a or not b: return Response({"error":"a,b required"}, status=400)
    import asyncio
    try:
        return Response({"score": asyncio.run(make_score(a, b))})
    except Exception:
        s = make_score_sync(a, b); s["source"] = "heuristic"
        return Response({"score": s})
