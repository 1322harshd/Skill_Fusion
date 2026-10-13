from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings
import os, requests
@api_view(["GET"])
@permission_classes([AllowAny])
def status_view(request):
    # See prompt_engineering/llm_client.py: os.getenv can't see python-decouple's .env values.
    sf_url=getattr(settings, "LLM_API_URL", None) or os.getenv("SF_URL","http://localhost:8081")
    try:
        r=requests.get(f"{sf_url}/v1/models", timeout=2)
        models=r.json().get("data",[])
    except: models=[]
    return Response({"sf": sf_url, "models": [m.get("id") for m in models], "tailscale": os.getenv("TAILSCALE_IP","100.64.x.y")})
