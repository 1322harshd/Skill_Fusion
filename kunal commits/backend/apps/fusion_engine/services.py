import hashlib, json
from .prompts import fusion_brief
from .schemas import BriefSchema
from apps.prompt_engineering.llm_client import call_sf14b

CURATED = {"Design×Code": "Ship a product you designed end-to-end", "Marketing×Data": "Run campaigns you can prove worked"}
GENERIC = [lambda a,b: f"Do {b} work that carries your {a} edge", lambda a,b: f"Turn your {a} instinct into {b} results", lambda a,b: f"Become the rare {a} + {b} hire"]

def fallback_brief(a,b, score):
    key = f"{a}×{b}"
    outcome = CURATED.get(key) or CURATED.get(f"{b}×{a}") or GENERIC[hash(a+b)%len(GENERIC)](a,b)
    return {"lede": f"When {a} and {b} sit side by side they stop being two keywords and start being one capability — {outcome}.", "complementarity": [f"{a} points at the problem; {b} is how you actually move it.", "Most people carry one or the other. Holding both makes you the person who ships the middle."], "applications": [f"A portfolio piece that pairs {a} thinking with {b} craft", f"Interview stories built on a real {a} × {b} artifact", "A role or service that only this blend can fill"], "industries": ["Product teams","Studios & agencies","Early-stage startups"], "insights": [f"Your rarity signal reads {(score.get('rarityLabel') or 'rare').lower()} — this pair stands out before you say a word.", f"Demand reads {(score.get('demandLabel') or 'steady').lower()}, so the blend itself matters more than polishing either side alone."]}

async def make_brief(a,b, score):
    prompt = fusion_brief(a,b, score)
    try:
        raw = await call_sf14b(adapter="sf-fusion", prompt=prompt)
        return BriefSchema.model_validate_json(raw).model_dump()
    except Exception:
        return fallback_brief(a,b, score)
