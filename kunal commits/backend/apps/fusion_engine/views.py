from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from .services import make_brief
from .quiz import generate_quiz, score_quiz
from apps.scores.services import make_score
from apps.roadmaps.services import make_roadmap
from apps.projects.services import make_project
from .models import Fusion
import hashlib

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
    # score + brief via SF:14B
    import asyncio
    score = __import__("asyncio").run(make_score(a,b)) if False else None
    # For scaffold, use sync fallback
    from apps.scores.services import make_score_sync
    score = make_score_sync(a,b)
    brief = __import__("asyncio").run(make_brief(a,b,score)) if False else None
    # fallback sync
    from .services import fallback_brief
    brief = fallback_brief(a,b,score)
    roadmap = make_roadmap(a,b)
    project = __import__("apps.projects.services", fromlist=["make_project"]).make_project(a,b)
    fid = f"f{hash(a+'×'+b)}"
    return Response({"fusion": {"id":fid, "a":a,"b":b,"score":score,"brief":brief,"roadmap":roadmap,"project":project}})

@api_view(["POST"])
@permission_classes([AllowAny])
def quiz_generate(request):
    skills=request.data.get("skills", ["Design","Code"])
    return Response(generate_quiz(skills))

@api_view(["POST"])
@permission_classes([AllowAny])
def quiz_submit(request):
    answers=request.data.get("answers", [])
    return Response({"levels": score_quiz(answers)})
