"""Evidence check: does the user's uploaded resume already prove a chosen
skill? If yes, SF estimates a 1-10 level from it and the quiz for that skill
is skipped; if no, the skill goes to the normal quiz path."""

import asyncio

RESUME_SHAPE = ('{"skills": [{"skill": string, "known": boolean, '
                '"level": integer 1-10 or null, "reason": string}]}')

MAX_RESUME = 12_000


def _unknown(skill, why):
    return {"label": skill, "known": False, "level": None, "source": "resume", "reason": why}


def _prompt(skills, resume_text):
    return (
        "You are judging what a resume proves. Two skills are listed below. "
        'For EACH skill output a decision with keys "skill", "known", "level", "reason".\n'
        "- known: true ONLY if the resume contains real evidence of that skill "
        "(job titles, responsibilities, projects, tools, technologies, degrees, certifications).\n"
        "- level: how strong that skill appears from the resume, integer 1-10 "
        "(senior professional evidence = 7+, regular professional use = 5-6, "
        "light/academic exposure = 2-3). null when not known.\n"
        "- reason: one short sentence quoting the exact words from the resume you relied on.\n"
        "- If the resume says nothing about the skill, known MUST be false and level null.\n"
        "Return ONLY valid JSON, no markdown fencing, no extra text, matching exactly: "
        + RESUME_SHAPE
        + "\n\nSKILLS: "
        + ", ".join(skills)
        + "\n\nRESUME (markdown):\n"
        + resume_text[:MAX_RESUME]
    )


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
    from prompt_engineering.llm_client import call_sf14b_json
    try:
        data = asyncio.run(call_sf14b_json("sf-evidence", _prompt(skills, text)))
    except Exception:
        return [_unknown(s, "We couldn't check the resume for this skill — take the quick quiz instead.") for s in skills]
    return _normalize(skills, data)
