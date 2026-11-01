from .prompts import fusion_brief, fusion_oracle
from .schemas import BriefSchema, OracleSchema
from prompt_engineering.llm_client import call_sf14b
from .categories import category_of

CURATED = {"Design×Code": "Ship a product you designed end-to-end", "Marketing×Data": "Run campaigns you can prove worked"}
GENERIC = [lambda a,b: f"Do {b} work that carries your {a} edge", lambda a,b: f"Turn your {a} instinct into {b} results", lambda a,b: f"Become the rare {a} + {b} hire"]

def fallback_brief(skills, score):
    """Deterministic offline brief for 2 OR 3 skills. The pair wording is
    byte-compatible with the original 2-skill version (Users/tests rely on
    the stable voice); trios get trio-flavored lines on the same skeleton."""
    skills = [str(s) for s in skills]
    a, b, third = (skills[0], skills[1], skills[2] if len(skills) > 2 else None)
    key = "×".join(skills)
    outcome = CURATED.get(key) or CURATED.get(f"{b}×{a}") or GENERIC[hash(a+b)%len(GENERIC)](a,b)
    consts_lede = (f"When {a}, {b} and {third} sit side by side they stop being three keywords and start being one capability — {outcome}."
                   if third else
                   f"When {a} and {b} sit side by side they stop being two keywords and start being one capability — {outcome}.")
    complementarity = [f"{a} points at the problem; {b} is how you actually move it.",
                       (f"The third leg matters most: {third} is what turns a promising blend into a routine you can actually run." if third
                        else "Most people carry one or the other. Holding both makes you the person who ships the middle.")]
    applications = [f"A portfolio piece that pairs {a} thinking with {b} craft" + (f" and {third} polish" if third else ""),
                    f"Interview stories built on a real {' × '.join(skills)} artifact",
                    "A role or service that only this blend can fill"]
    industries = ["Product teams", "Studios & agencies", "Early-stage startups"]
    insights = [f"Your rarity signal reads {(score.get('rarityLabel') or 'rare').lower()} — this {'combination' if third else 'pair'} stands out before you say a word.",
                f"Demand reads {(score.get('demandLabel') or 'steady').lower()}, so the {'mix' if third else 'blend'} itself matters more than polishing any one side alone."]
    return {"lede": consts_lede, "complementarity": complementarity, "applications": applications,
            "industries": industries, "insights": insights}

async def make_brief(skills, score):
    skills = [str(s) for s in skills]
    try:
        raw = await call_sf14b(adapter="sf-fusion", prompt=fusion_brief(skills, score))
        return BriefSchema.model_validate_json(raw).model_dump()
    except Exception:
        return fallback_brief(skills, score)


# ---- Fusion Oracle --------------------------------------------------------
# Deterministic offline debate: mirrors the "never dead-end" pattern used by
# roadmaps and the brief — SF shapes it when up, the templates carry it down.

SKEPTIC = [
    "Nobody's job filter asks for {a} — {b} alone is already a crowded room, and the extra skill reads as noise on a CV.",
    "Recruiters pattern-match one keyword at a time. {a} × {b} lands as a typo, not a strategy.",
    "Each of these takes years to get good at alone. Split your effort and you end up mediocre at both — hired at neither.",
    "There's no established title for this blend. No title means no filter ever surfaces you to a hiring panel.",
    "Real roles pick one lane. This pairing reads like someone who couldn't commit to a direction.",
]
ORACLE = [
    "Precisely because nobody lists {a} and {b} together, whoever holds both is un-copyable — supply of one is effectively zero.",
    "{a} people all share the same blind spot, and {b} happens to walk straight through it. That's the edge.",
    "This blend has no market price yet — the first credible practitioner sets it, and you'd be first.",
    "One artifact that proves {a} × {b} beats ten résumés proving each. Vocabulary-blending beats keyword-splitting every time.",
    "Every role that now has a title began as 'no established title'. Someone has to be the somebody — why panel-awe you?",
]
HEADLINES = [
    "{a} supplies the instinct, {b} supplies the map — and no résumé stack competes there.",
    "Uncrowded by construction; crowded only if you wait for a title to exist first.",
    "Weird enough to be remembered, real enough to ship — the blend is the brand.",
    "{b} makes {a} rare; {a} makes {b} useful. That's the whole pitch.",
]
QUESTIONS = [
    "What does {b} look like when only the {a} crowd gets to see it?",
    "If you had to be the world's best at {a} × {b} by Friday, what's the one artifact you'd build first?",
    "Which problem inside {b} could {a} solve so cheaply it becomes almost silly?",
    "Where do {a} people already gather — and what do they all fail at that {b} would fix?",
]

def fallback_oracle(a, b):
    """Deterministic offline debate. Same pair always yields the same verdict
    (decisions should feel meaningful, not random) and it alternates voices
    exactly like the SF contract so the UI only needs one renderer."""
    seed = hash(f"{a}×{b}oracle")
    same = category_of(a) == category_of(b)
    debate = [
        {"voice": "skeptic", "line": SKEPTIC[seed % len(SKEPTIC)].format(a=a, b=b)},
        {"voice": "oracle", "line": ORACLE[(seed >> 2) % len(ORACLE)].format(a=a, b=b)},
        {"voice": "skeptic", "line": SKEPTIC[(seed + 2) % len(SKEPTIC)].format(a=a, b=b)},
        {"voice": "oracle", "line": ORACLE[(seed + 3) % len(ORACLE)].format(a=a, b=b)},
    ]
    # Same-category pairs twist the story: you're not splitting the market,
    # you're sharpening it — so skeptic #2 is rewritten, not copied.
    if same:
        debate[2]["line"] = (f"And both halves come from the same room — {a} × {b} means "
                             f"competing head-on with the very crowd you're trying to stand out in.")
        debate[3]["line"] = (f"Then don't blend two rooms — build the sharpest instrument inside the one you "
                             f"already know, and let {b} weaponize what {a} people take for granted.")
    stars = 3 + (0 if same else 1) + ((seed >> 5) % 3 - 1)
    verdict = {
        "stars": max(1, min(5, stars)),
        "headline": HEADLINES[(seed >> 4) % len(HEADLINES)].format(a=a, b=b),
        "question": QUESTIONS[(seed >> 6) % len(QUESTIONS)].format(a=a, b=b),
    }
    return {"debate": debate, "verdict": verdict}

async def make_oracle(a, b):
    try:
        raw = await call_sf14b(adapter="sf-fusion", prompt=fusion_oracle(a, b))
        return OracleSchema.model_validate_json(raw).model_dump()
    except Exception:
        return fallback_oracle(a, b)
