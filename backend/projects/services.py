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
