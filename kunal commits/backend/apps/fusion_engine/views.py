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
    # score: real job-data when listings exist, else labeled heuristic.
    # brief: SF-first via make_brief (falls back to curated template on error).
    import asyncio
    from apps.scores.services import make_score, make_score_sync
    from .services import make_brief
    try:
        score = asyncio.run(make_score(a, b))
    except Exception:
        score = make_score_sync(a,b)
        score["source"] = "heuristic"
    brief = asyncio.run(make_brief(a,b,score))
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
