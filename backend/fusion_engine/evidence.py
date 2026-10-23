"""Evidence check: does the user's uploaded resume already prove a chosen
skill? If yes, SF estimates a 1-10 level from it and the quiz for that skill
is skipped; if no, the skill goes to the normal quiz path."""

import asyncio
import re

RESUME_SHAPE = ('{"skills": [{"skill": string, "known": boolean, '
                '"level": integer 1-10 or null, "reason": string}]}')

MAX_LINE_CHARS = 200
MAX_LINES = 6

_SKILL_TERMS = {
    "engineering": [
        "engineer", "engineering", "software", "developer", "backend", "frontend",
        "full-stack", "fullstack", "django", "fastapi", "python", "javascript",
        "typescript", "react", "node", "docker", "kubernetes", "postgres", "sql",
        "api", "aws", "devops", "infrastructure", "compiler", "swift",
    ],
    "growth": [
        "growth", "marketing", "seo", "funnel", "acquisition", "retention",
        "conversion", "newsletter", "subscribers", "audience", "campaign",
        "viral", "social media", "content",
    ],
}


def _lines_for_skill(lines, skill):
    """Lines of the resume that mention this skill (or a known synonym)."""
    terms = [skill.lower()] + _SKILL_TERMS.get(skill.lower(), [])
    pats = [re.compile(r"(?<![a-z])" + re.escape(t) + r"(?![a-z])", re.I) for t in terms if t]
    return [l[:MAX_LINE_CHARS] for l in lines if pats and any(p.search(l) for p in pats)]


def _sections(text, skills):
    """One compact excerpt per skill: synonym lines when available, otherwise a
    tiny head-of-text fallback so SF can still judge unusual skill names."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return {s: _lines_for_skill(lines, s)[:MAX_LINES] or lines[:MAX_LINES] for s in skills}


def _prompt(skills, sections):
    parts = [
        "Judge each skill using ONLY the lines shown from the user's resume. "
        'For EACH skill output keys "skill", "known", "level", "reason".\n'
        "- known: true ONLY if the lines contain real evidence of that skill "
        "(titles, responsibilities, projects, tools, degrees, certifications).\n"
        "- level: strength, integer 1-10 (senior professional = 7+, regular "
        "professional = 5-6, light/academic = 2-3). null when not known.\n"
        "- reason: one short sentence quoting the words you relied on.\n"
        "- If a skill's lines do not prove it, known MUST be false and level null.\n"
        "- Keep thinking minimal; reply JSON matching exactly: " + RESUME_SHAPE
    ]
    for skill in skills:
        parts.append("\n\nSKILL: " + skill + "\nLINES:")
        parts += ["- " + l for l in sections[skill]]
    return "\n".join(parts)


def _unknown(skill, why):
    return {"label": skill, "known": False, "level": None, "source": "resume", "reason": why}


def _normalize(requested, data):
    """Map SF output onto the requested skills, clamping levels; anything the
    SF answer misses or mangles falls back to unknown (fail-open to quiz)."""
    got = {}
    for item in (data.get("skills") or []) if isinstance(data, dict) else []:
        if not isinstance(item, dict):
            continue
        key = str(item.get("skill", "")).strip().lower()
        got[key] = item
    out = []
    for skill in requested:
        item = got.get(skill.lower())
        if not item or not item.get("known") or item.get("level") is None:
            out.append(_unknown(skill, "The resume has no clear evidence for this skill."))
            continue
        try:
            level = max(1, min(10, int(item["level"])))
        except (TypeError, ValueError):
            out.append(_unknown(skill, "The resume has no clear evidence for this skill."))
            continue
        reason = str(item.get("reason", "")).strip() or "Evidence found in your resume."
        out.append({"label": skill, "known": True, "level": level,
                    "source": "resume", "reason": f"From your resume: {reason}"})
    return out


def judge_skills_from_resume(user, skills):
    """Returns one entry per skill (order preserved):
    {label, known, level (1-10 or null), source, reason}."""
    from resume.models import ResumeUpload
    upload = ResumeUpload.objects.filter(user=user).first()
    text = (upload.extractedText if upload else "").strip()
    if not text:
        return [_unknown(s, "No resume uploaded for this skill to be read against.") for s in skills]

    # SF's hidden reasoning pass explodes on long prompts (~90s/attempt), so we
    # feed it only the skill-relevant lines (~1k chars) instead of the full CV.
    sections = _sections(text, skills)
    prompt = _prompt(skills, sections)

    from prompt_engineering.llm_client import call_sf14b_json
    try:
        data = asyncio.run(call_sf14b_json("sf-evidence", prompt, retries=1))
    except Exception:
        return [_unknown(s, "We couldn't check the resume for this skill — take the quick quiz instead.") for s in skills]
    return _normalize(skills, data)
