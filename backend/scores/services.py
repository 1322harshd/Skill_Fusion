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
    THIRD={"tech":["AI","Automation","Data"],"creative":["Motion","Storytelling","Illustration"],"business":["Sales","Strategy","Pricing"],"science":["Statistics","Research","Neuroscience"],"comm":["Writing","Public Speaking","Community"]}
    # category via hash
    cat=list(THIRD.keys())[(seed & 1) % len(THIRD)]
    pool=THIRD[cat]
    pick=pool[(seed>>6)%len(pool)]
    if pick in (a,b):
        # rotate the pool so the fallback can't return a pair member
        for cand in pool[1:]+pool[:1]:
            if cand not in (a,b): pick=cand; break
    skill=pick
    delta=8+((seed>>3)%9)
    return {"value":value,"rarity":rarity,"demand":demand,"rarityLabel":rarityLabel,"demandLabel":demandLabel,"explanation":explanation,"recommendation":{"skill":skill,"delta":delta,"category":cat},"history":[value]}

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
