from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import asyncio
from .services import explain_feedback
@api_view(["POST"])
@permission_classes([AllowAny])
def explain_view(request):
    a=request.data.get("a"); b=request.data.get("b"); text=request.data.get("text",""); ctx=request.data.get("context","week")
    # scaffold sync fallback
    import hashlib
    seed=int(hashlib.md5(f"{a}×{b}{text[:10]}".encode()).hexdigest()[:2],16)
    clarity=["Clear","Tight","Specific"][seed%3]
    return Response({"clarity":clarity, "note":f"You connected {a} and {b}","suggestion":f"Add detail for {a}×{b}"})
