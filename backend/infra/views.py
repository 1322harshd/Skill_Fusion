from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import os, requests
@api_view(["GET"])
@permission_classes([AllowAny])
def status_view(request):
    sf_url=os.getenv("SF_URL","http://localhost:8081")
    try:
        r=requests.get(f"{sf_url}/v1/models", timeout=2)
        models=r.json().get("data",[])
    except: models=[]
    return Response({"sf": sf_url, "models": [m.get("id") for m in models], "tailscale": os.getenv("TAILSCALE_IP","100.64.x.y")})
