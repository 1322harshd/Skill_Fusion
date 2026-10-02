from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .services import get_previews

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
    # persist roadmap choice
    return Response({"ok":True})

@api_view(["POST"])
@permission_classes([AllowAny])
def regenerate_view(request):
    fusion = request.data.get("fusion")
    salt = request.data.get("salt",0)
    next_salt = (salt or 0)+1
    return Response({"salt": next_salt, "previews": get_previews(fusion, next_salt)})
