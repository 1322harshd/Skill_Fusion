import json

import requests
from django.conf import settings


class LlmError(Exception):
    """Raised when the LLM endpoint can't be reached or returns something unusable."""


SYSTEM_PROMPT = """You are a resume and cover letter writer for SkillFusion, a platform where \
learners log verified evidence of their work (projects, credentials, GitHub repos).

You are given a learner's name, skills, and a list of Growth Log entries (their real, logged \
evidence) and, optionally, a job listing they want to apply to.

Write ONLY from the evidence given to you. Do not invent projects, employers, or skills that \
aren't in the evidence. If the evidence is thin, write a shorter, honest resume rather than \
padding it with invented claims.

Respond with ONLY a single JSON object, no other text, in exactly this shape:
{"resumeSummary": "2-3 sentence professional summary", \
"resumeBullets": ["bullet grounded in one piece of evidence", "..."], \
"coverLetter": "a complete cover letter, 3-4 short paragraphs"}

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
                # Observed: despite enable_thinking=false, this model still burns ~2000
                # tokens on an internal reasoning pass before writing the real JSON answer.
                # 2000 wasn't enough headroom and got cut off before any answer appeared.
                "max_tokens": 4096,
                "stream": False,
                "enable_thinking": False,
            },
            # A trivial empty-evidence prompt alone took ~85s. Real evidence takes longer.
            timeout=240,
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

    content = (message.get("content") or "") + (message.get("reasoning") or "")
    data = _extract_json_object(content)

    for field in ("resumeSummary", "resumeBullets", "coverLetter"):
        if field not in data:
            raise LlmError(f"Model response was missing '{field}'.")
    return data
