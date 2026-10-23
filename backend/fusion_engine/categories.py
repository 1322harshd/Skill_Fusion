"""Skill → domain-category mapping.

Server-side port of frontend/src/app/fusion.js categoryOf() so persisted
Fusion rows carry the same category_a/category_b the UI computes; keeping
the two in sync matters because FusionScoreCache and history views expose
categories back to the frontend. When the frontend RULES/DOMAINS change,
change this file in the same commit.
"""
import re

CATEGORY_ORDER = ["tech", "creative", "business", "science", "comm"]

DOMAINS = {
    "tech": ["Web Dev", "Frontend", "Backend", "Python", "JavaScript", "APIs", "Cloud", "ML", "SQL", "Framer Motion"],
    "creative": ["UI Design", "UX Research", "Branding", "Illustration", "Graphic Design", "Motion & 3D", "Sound Design", "Photography"],
    "business": ["Marketing", "Growth", "Product Management", "Strategy", "Finance", "Operations", "Sales", "Entrepreneurship"],
    "science": ["Data Science", "Statistics", "Research", "Psychology", "Math", "Physics", "Biology"],
    "comm": ["Writing", "Copywriting", "Editing", "Storytelling", "Public Speaking", "Teaching", "Social Media"],
}

RULES = [
    (r"code|progr|dev|engineer|ai\b|ml\b|data|sql|cloud|cyber|api|soft|back-end|backend|front|python|react|automation|security|hardware|analytics", "tech"),
    (r"design|illust|art|photo|video|anim|ui\b|ux\b|brand|content|music|sound|fashion|motion|3d", "creative"),
    (r"market|sales|business|finance|startup|product|strateg|operat|manage|entrepreneur|growth|pricing|account|negotiat|ecom", "business"),
    (r"scien|math|research|bio|phys|chem|stat|lab|psych|neurosci", "science"),
    (r"communi|present|teach|coach|public|social|story|editor|copy|language|speak|writing|content", "comm"),
]


def hash(s):
    # Mirrors the JS frontend int32 pipeline exactly: (h*31+c) | 0 each step,
    # then Math.abs. `& 0xFFFFFFFF` alone would diverge once the accumulator
    # wraps into the > 2^31 range (categories silently differ between
    # frontend and backend for hash-fallback skills).
    h = 0
    for ch in str(s or ""):
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
        if h >= 0x80000000:
            h -= 0x100000000
    return abs(h)


def category_of(name):
    name = str(name or "")
    for cat, skills in DOMAINS.items():
        if name in skills:
            return cat
    for pattern, cat in RULES:
        if re.search(pattern, name, flags=re.IGNORECASE):
            return cat
    return CATEGORY_ORDER[hash(name) % len(CATEGORY_ORDER)]
