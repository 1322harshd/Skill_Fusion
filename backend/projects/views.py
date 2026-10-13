from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .services import make_project
@api_view(["POST"])
@permission_classes([AllowAny])
def project_view(request):
    a=request.data.get("a"); b=request.data.get("b")
    if not a or not b: return Response({"error":"a,b required"}, status=400)
    return Response({"project": make_project(a,b)})
