def hash(s):
    h=0
    for ch in str(s): h=(h*31+ord(ch)) & 0xFFFFFFFF
    return abs(h)

from datetime import timedelta

SCORE_CACHE_TTL = timedelta(days=7)  # weekly recompute budget


def _pair_key(a, b):
    """Canonical (lower, alpha-sorted) pair so Data×Marketing reads the row
    Marketing×Data wrote; values are order-insensitive blends either way."""
    lo, hi = sorted((str(a).strip(), str(b).strip()))
    return lo.lower(), hi.lower()


def get_cached_score(a, b):
    from django.utils import timezone
    from .models import FusionScoreCache
    ka, kb = _pair_key(a, b)
    try:
        row = FusionScoreCache.objects.get(skill_a=ka, skill_b=kb)
    except FusionScoreCache.DoesNotExist:
        return None
    if timezone.now() - row.computed_at > SCORE_CACHE_TTL:
        return None
    return {"cached": True, **row.score_json}


def put_cached_score(a, b, score):
    """update_or_create keeps rows unique per pair — the weekly-recompute
    command reppers the same rows instead of piling up duplicates."""
    from django.utils import timezone
    from .models import FusionScoreCache
    ka, kb = _pair_key(a, b)
    FusionScoreCache.objects.update_or_create(
        skill_a=ka, skill_b=kb,
        defaults={"score_json": score, "computed_at": timezone.now()})
    return score


def make_score_sync(a,b):
    seed=hash(a+'×'+b)
    rarity=0.55 + (seed%400)/1000
    demand=0.45 + ((seed>>4)%400)/1000
    value=round((rarity*0.45+demand*0.55)*100)
    rarityLabel="Exceptional" if rarity>=0.8 else "Rare" if rarity>=0.65 else "Uncommon" if rarity>=0.5 else "Common"
    demandLabel="In demand" if demand>=0.75 else "Steady" if demand>=0.6 else "Growing" if demand>=0.45 else "Emerging"
    explanation=[f"Very few people lead with {a} and {b} together, so you stand out before you even talk to a recruiter.", f"Jobs asking for this blend are {demandLabel.lower()}; when one appears, competition is thinner than for either skill alone.", f"The pair reads as a full capability — {a} gives the depth, {b} gives the proof — instead of two vague keywords."]
    cat, skill, _ = _pick_third(seed, [a, b])
    delta=8+((seed>>3)%9)
    return {"value":value,"rarity":rarity,"demand":demand,"rarityLabel":rarityLabel,"demandLabel":demandLabel,"explanation":explanation,"recommendation":{"skill":skill,"delta":delta,"category":cat},"history":[value]}


# The third-skill recommendation pool, one lane per domain. Pair scores draw
# from whichever domain the pair doesn't already cover, so the nudge reads as
# genuine range instead of a cousin of what the user already has.
THIRD = {
    "tech": ["AI", "Automation", "Prompt Engineering"],
    "creative": ["Storytelling", "Motion & 3D", "Video Editing"],
    "business": ["Sales", "Strategy", "Negotiation"],
    "science": ["Statistics", "Research", "Neuroscience"],
    "comm": ["Writing", "Public Speaking", "Copywriting"],
    "everyday": ["Cooking", "Gardening", "First Aid"],
    "wellness": ["Meditation", "Nutrition", "Running"],
    "craft": ["3D Printing", "Electronics", "Woodworking"],
}


def _pick_third(seed, skills):
    """Deterministic (category, suggestion, delta-context) for a set of skills
    the user already holds: prefer domains none of them cover, and the
    suggestion itself can never be a skill the user already has."""
    from fusion_engine.categories import category_of
    held = {s.lower() for s in skills}
    covered = {category_of(s) for s in skills}
    fresh = [k for k in THIRD if k not in covered] or list(THIRD.keys())
    # seed-rotated domain order, fresh (uncovered) domains first
    r = (seed >> 2) % len(fresh)
    ordered = fresh[r:] + fresh[:r]
    for cat in ordered:
        pool = [p for p in THIRD[cat] if p.lower() not in held]
        if pool:
            return cat, pool[(seed >> 6) % len(pool)], cat
    # uncovered lanes exhausted — scan all categories; a held skill can
    # still never repeat
    for cat in THIRD:
        pool = [p for p in THIRD[cat] if p.lower() not in held]
        if pool:
            return cat, pool[(seed >> 6) % len(pool)], cat
    return "tech", "AI", "tech"


def make_score_sync_n(skills):
    """Trio heuristic for re-fused fusions (N>2 has no job-data pipeline).
    Deterministic and honest: the score is recomputed from scratch for the
    trio — never the pair value plus the advertised delta — so it may land
    lower than the nudge promised. A trio is complete, so recommendation is
    null (no fourth-skill push)."""
    skills = [str(s).strip() for s in skills if str(s).strip()]
    # canonical order so the payload is identical for any ordering and any
    # casing of the same three skills (deterministic, order-insensitive);
    # taxonomy casing wins when the skill is one of ours, else first-seen
    seen = {}
    for s in skills:
        seen.setdefault(s.lower(), s)
    from fusion_engine.categories import DOMAINS
    canon = {}
    for k, first_seen in seen.items():
        official = next((d for pool in DOMAINS.values() for d in pool if d.lower() == k), None)
        canon[k] = official or first_seen
    skills = [canon[k] for k in sorted(canon)]
    key = "×".join(sorted(s.lower() for s in skills))
    seed = hash(key)
    rarity = 0.50 + (seed % 300) / 1000          # [0.50, 0.80) — breadth reads less rare
    demand = 0.55 + ((seed >> 4) % 350) / 1000   # [0.55, 0.90) — wider coverage, steadier demand
    value = round((rarity * 0.45 + demand * 0.55) * 100)
    rarityLabel = "Exceptional" if rarity >= 0.8 else "Rare" if rarity >= 0.65 else "Uncommon" if rarity >= 0.5 else "Common"
    demandLabel = "In demand" if demand >= 0.75 else "Steady" if demand >= 0.6 else "Growing" if demand >= 0.45 else "Emerging"
    a, b, c = skills[0], skills[1], skills[-1]
    explanation = [
        f"Three skills rarely travel together — {a}, {b} and {c} is a fuller capability than any two of them alone.",
        f"Roles that genuinely use all three stay {demandLabel.lower()}; breadth widens the door without diluting the proof.",
        "Re-checked as a trio, not the pair plus a bonus — this number is what the combination reads as today.",
    ]
    return {"value": value, "rarity": rarity, "demand": demand, "rarityLabel": rarityLabel,
            "demandLabel": demandLabel, "explanation": explanation, "recommendation": None,
            "history": [value], "source": "trio-heuristic", "skills": skills}

# async version: real pgvector + job counts when data exists, labeled heuristic
# otherwise. (DB + HTTP are blocking — run via sync_to_async under the hood
# by keeping this body fully synchronous; callers wrap with asyncio.run.)
async def make_score(a, b):
    import asyncio
    return await asyncio.to_thread(make_score_sync_real, a, b)


def make_score_sync_real(a, b):
    cached = get_cached_score(a, b)
    if cached is not None:
        return cached
    from django.db import connection
    from .jobs_pipeline import embed_texts
    # Case-insensitive matching: cached keys are canonical-lowercase (weekly
    # recompute passes canonical form), while JobListing.query stores whatever
    # casing the ingest command used.
    with connection.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM scores_joblisting WHERE LOWER(query) IN (%s, %s)",
                    [a.lower(), b.lower()])
        n = cur.fetchone()[0]
    if n >= 10:
        [pair_vec] = embed_texts([f"{a} {b}"])
        with connection.cursor() as cur:
            cur.execute(
                "SELECT AVG(embedding <=> %s::vector) FROM scores_joblisting "
                "WHERE embedding IS NOT NULL AND LOWER(query) IN (%s, %s)",
                [pair_vec, a.lower(), b.lower()])
            avg_dist = cur.fetchone()[0] or 1.0
        rarity = round(max(0.0, min(1.0, avg_dist)), 3)
        demand = round(max(0.0, min(1.0, min(n, 200) / 200)), 3)
        value = round((rarity * 0.45 + demand * 0.55) * 100)
        out = make_score_sync(a, b)
        out.update({"value": value, "rarity": rarity, "demand": demand,
                    "source": "jobdata", "listings": n})
        return put_cached_score(a, b, out)
    out = make_score_sync(a, b)
    out["source"] = "heuristic"
    return put_cached_score(a, b, out)
