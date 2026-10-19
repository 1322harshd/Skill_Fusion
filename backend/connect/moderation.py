import re

# A deliberately small, obvious starter list — easy to extend. This is a
# blunt first-pass filter (FR-9.3 "apply a moderation filter"), separate
# from the user-driven report/review flow it sits alongside.
BANNED_WORDS = [
    "fuck", "shit", "bitch", "asshole", "cunt", "retard", "faggot", "nigger",
    "kill yourself", "kys",
]

_PATTERN = re.compile(r"\b(" + "|".join(re.escape(w) for w in BANNED_WORDS) + r")", re.IGNORECASE)


def contains_banned_content(text: str) -> bool:
    return bool(_PATTERN.search(text or ""))
