import json

import requests
from django.conf import settings


class LlmError(Exception):
    """Raised when the LLM endpoint can't be reached or returns something unusable."""


# In ECS, the model lives on a Tailscale-only machine, reachable only through
# the Tailscale sidecar's local proxy (empty locally, where LLM_API_URL is
# directly reachable) — same as prompt_engineering/llm_client.py's SF_PROXIES.
# Without this, the connection just hangs against the tailnet-only address
# until gunicorn's worker timeout kills it.
_TAILSCALE_PROXY_URL = getattr(settings, "TAILSCALE_PROXY_URL", "") or ""
LLM_PROXIES = {"http": _TAILSCALE_PROXY_URL, "https": _TAILSCALE_PROXY_URL} if _TAILSCALE_PROXY_URL else None


SYSTEM_PROMPT = """You are a resume and cover letter writer for SkillFusion, a platform where \
learners log verified evidence of their work (projects, credentials, GitHub repos).

You are given a learner's name, skills, a list of Growth Log entries (their real, logged \
evidence), optionally the text of a resume they already have, and, optionally, a job listing \
they want to apply to.

Write ONLY from the evidence given to you — the Growth Log entries and, when present, their \
uploaded resume text. Do not invent projects, employers, or skills that aren't in that evidence. \
If the evidence is thin, write a shorter, honest resume rather than padding it with invented \
claims.

Respond with ONLY a single JSON object, no other text, in exactly this shape:
{"resumeSummary": "2-3 sentence professional summary", \
"resumeSkillGroups": [{"category": "a short category name", "skills": ["skill", "..."]}, "..."], \
"resumeProjects": [{"title": "short project title", "techStack": "comma-separated tools/skills used, or empty string", \
"bullets": ["resume-style bullet grounded in this project's evidence", "..."]}, "..."], \
"coverLetter": "a complete cover letter, 3-4 short paragraphs"}

For resumeSkillGroups: group the learner's declared skills into roughly 3-6 natural categories \
you infer from the skills themselves — do NOT force a fixed software-engineering taxonomy like \
"Languages" or "Cloud & DevOps", since the learner's skills may not be technical at all. Order \
the groups by relevance to the job listing when one is given.

For resumeProjects: produce exactly one entry per distinct Growth Log entry given to you — never \
merge two entries together and never invent an entry that wasn't given. Each project's title \
should lightly tighten that entry's own title (don't rename it into something unrelated), \
techStack should be built from that entry's own tags (empty string if it has none), and its \
1-3 bullets must be grounded only in that entry's own description — the same "don't invent, \
write it thin and honest if the evidence is thin" rule applies per project now, not just \
globally.

If a job listing was provided, tailor the summary and cover letter to it. If not, write a \
general-purpose version."""


def _extract_json_object(text: str) -> dict:
    """The model sometimes trails reasoning text after the JSON object. Find the
    first balanced {...} and parse only that, ignoring anything before or after."""
    start = text.find("{")
    if start == -1:
        raise LlmError("Model response contained no JSON object.")

    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                candidate = text[start : i + 1]
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError as e:
                    raise LlmError(f"Could not parse model JSON: {e}") from e

    raise LlmError("Model response had an unterminated JSON object.")


def generate_resume_content(user_prompt: str) -> dict:
    """Calls the chat completions endpoint and returns the parsed
    {resumeSummary, resumeBullets, coverLetter} dict."""
    try:
        response = requests.post(
            f"{settings.LLM_API_URL}/v1/chat/completions",
            json={
                "model": settings.LLM_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 4096,
                "stream": False,
                # Must be nested under chat_template_kwargs — a top-level
                # enable_thinking key is silently ignored by mlx_lm.server,
                # which is why this was still burning ~2000 reasoning tokens
                # despite "setting" it (see prompt_engineering/llm_client.py's
                # matching comment, which caught this the first time).
                "chat_template_kwargs": {"enable_thinking": False},
            },
            # A trivial empty-evidence prompt alone took ~85s. Real evidence takes longer.
            timeout=240,
            proxies=LLM_PROXIES,
        )
    except requests.RequestException as e:
        raise LlmError(f"Could not reach the LLM service: {e}") from e

    if response.status_code != 200:
        raise LlmError(f"LLM service returned {response.status_code}.")

    try:
        choice = response.json()["choices"][0]
        message = choice["message"]
    except (KeyError, IndexError, ValueError) as e:
        raise LlmError(f"Unexpected LLM response shape: {e}") from e

    # Low max_tokens can cut the model off before it reaches the JSON answer
    # (content comes back null, reasoning is left mid-thought) — treat that as
    # a clear failure rather than trying to parse an incomplete response.
    if choice.get("finish_reason") == "length":
        raise LlmError("Model response was cut off before completing (increase max_tokens).")

    # The JSON answer can land in either field depending on how the model split its
    # output, so check both and let _extract_json_object find the object in whichever has it.
    content = (message.get("content") or "") + (message.get("reasoning") or "")
    data = _extract_json_object(content)

    for field in ("resumeSummary", "resumeSkillGroups", "resumeProjects", "coverLetter"):
        if field not in data:
            raise LlmError(f"Model response was missing '{field}'.")
    return data
