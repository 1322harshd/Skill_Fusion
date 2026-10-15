import asyncio

from prompt_engineering.llm_client import call_sf14b_json

TONE_GUIDANCE = {
    "Professional": "Measured and credible — the kind of post a recruiter or hiring manager would take seriously.",
    "Warm": "Honest and understated — documenting real progress without overselling it.",
    "Punchy": "Short, confident, high-energy — built to stop a scroll.",
}


def generate_post_text(entry, tone="Warm", salt=0) -> str:
    """Generates a shareable social-media post summarising one Growth Log
    entry, grounded only in that entry's actual data (FR-8.1)."""
    tone = tone if tone in TONE_GUIDANCE else "Warm"
    tags = ", ".join(list(entry.skillTags) + list(entry.competencyTags))
    status = "verified" if entry.verified else "self-reported"

    prompt = (
        f"Write ONE shareable social-media post (LinkedIn/X style, under 500 characters, "
        f"no hashtags unless they feel natural) summarising this learner's achievement. "
        f"Write ONLY from the evidence given — do not invent details.\n\n"
        f"Tone: {tone} — {TONE_GUIDANCE[tone]}\n"
        f"Achievement: {entry.title}\n"
        f"Details: {entry.description or '(no further description)'}\n"
        f"Status: {status}\n"
        + (f"Tags: {tags}\n" if tags else "")
        + (f"(variation seed {salt} — give a genuinely different angle/phrasing than a default draft)\n" if salt else "")
        + '\nRespond with ONLY valid JSON: {"text": "the post, ready to copy-paste"}'
    )

    data = asyncio.run(call_sf14b_json("sf-post", prompt, max_tokens=1200))
    text = (data.get("text") or "").strip()
    if not text:
        raise ValueError("SF returned an empty post.")
    return text
