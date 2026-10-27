import asyncio
from prompt_engineering.llm_client import call_sf14b_json

# UI contract (frontend/src/app/Project.js): every key the project page reads.
BRIEF_SHAPE = ('{"title": string, "client": string, "timeline": string, '
    '"format": string, "audience": string, "goal": string, '
    '"tools": [string, string, string], "deliverables": [string, string, string], '
    '"expectedOutcome": string}')

def _lst(v, default_text):
    if isinstance(v, list):
        items = [str(x) for x in v if str(x).strip()]
        return items or [default_text]
    s = str(v or "").strip()
    return [s] if s else [default_text]

def normalize_brief(raw, a, b):
    """Map whatever SF returned (current snake_case shape or older variants)
    onto the full UI contract, filling every missing field with defensible
    defaults — the project page must always render."""
    raw = raw if isinstance(raw, dict) else {}
    def pick(*keys, default=""):
        for k in keys:
            v = raw.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
            if isinstance(v, list) and v:
                return v
        return default
    return {
        "title": pick("title", default=f"{a} × {b} flagship project"),
        "client": pick("client", "client_type", default="Self-directed"),
        "timeline": pick("timeline", "duration", default="2-4 weeks"),
        "format": pick("format", "format_type", default="Web experience"),
        "audience": pick("audience", default="Early adopters and reviewers"),
        "goal": pick("goal", "goal_statement", "concept", default=str(raw.get("expected_outcome") or "").strip() or f"One flagship artifact that proves {a} × {b} in the real world."),
        "tools": _lst(raw.get("tools"), "Tools of your trade"),
        "deliverables": _lst(raw.get("deliverables") or raw.get("key_deliverables"), "A shipped, shareable artifact"),
        "expectedOutcome": str(pick("expectedOutcome", "expected_outcome", "outcome") or "Hireable proof of the fusion, not just a certificate."),
        "status": str(raw.get("status") or "brief"),
    }

def make_project(a, b):
    prompt = (f'Propose one flagship project brief combining "{a}" and "{b}". '
              'Client should be a realistic sponsor, timeline a 2-4 phrase, format the artifact type, '
              'audience who it is for. Keep every value one short line. '
              f'Return ONLY valid JSON, no markdown fencing, no extra text, matching exactly: {BRIEF_SHAPE}')
    raw = asyncio.run(call_sf14b_json("sf-project", prompt))
    return normalize_brief(raw, a, b)


# ---- milestone submission assessment --------------------------------------
ASSESS_SHAPE = ('{"matchScore": integer 0-100, "closeness": "strong | partial | weak", '
    '"strengths": [string, string], "gaps": [string, string], "verdict": string}')

def assess_submission(brief, explanation, artifact_text, source_link=""):
    """Grade the submitted work against the project brief like an assessor:
    how much of the briefed deliverable actually exists in the artifact."""
    prompt = (
        "You are assessing a submitted project like a strict but fair college "
        "assessor. Below are the PROJECT BRIEF (what was supposed to be built), "
        "the student's own explanation, and the submitted artifact text.\n"
        "Compare the artifact against the brief: does the described work exist, "
        "is it real and complete, does it use BOTH skills of the fusion?\n"
        "grade matchScore 0-100 (0 = nothing in the artifact matches the brief, "
        "100 = all briefed deliverables clearly present and complete); closeness "
        "strong (75+) / partial (35-74) / weak (<35); strengths: 2 things done "
        "well; gaps: 2 concrete things missing or unproven; verdict: 1-2 sentence "
        "assessment in plain words.\n"
        f'Return ONLY valid JSON, no markdown fencing, matching exactly: {ASSESS_SHAPE}\n\n'
        "PROJECT BRIEF:\n" + str(brief)[:1500] + "\n\n"
        "STUDENT EXPLANATION:\n" + str(explanation)[:1500] + "\n\n"
        "SUBMITTED ARTIFACT TEXT:\n" + str(artifact_text)[:6000]
        + ("\n\nSOURCE LINK: " + source_link if source_link else "")
    )
    raw = asyncio.run(call_sf14b_json("sf-assess", prompt, retries=1))

    if not isinstance(raw, dict):
        raw = {}
    try:
        score = max(0, min(100, int(raw.get("matchScore"))))
    except (TypeError, ValueError):
        score = None
    closeness = str(raw.get("closeness", "")).lower()
    if closeness not in ("strong", "partial", "weak"):
        closeness = "weak" if (score is None or score < 35) else "partial" if score < 75 else "strong"
    return {
        "matchScore": score,
        "closeness": closeness,
        "strengths": [str(s) for s in (raw.get("strengths") or [])[:3]],
        "gaps": [str(s) for s in (raw.get("gaps") or [])[:3]],
        "verdict": str(raw.get("verdict", "")).strip() or "Assessed against the project brief.",
    }
