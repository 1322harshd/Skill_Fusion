from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .llm_client import call_sf14b
import asyncio
@api_view(["POST"])
@permission_classes([AllowAny])
def generate_view(request):
    adapter=request.data.get("adapter","sf-fusion")
    prompt=request.data.get("prompt","")
    try:
        text=asyncio.run(call_sf14b(adapter, prompt))
    except Exception as e:
        return Response({"error": str(e)[:200]}, status=502)
    return Response({"response": text})
