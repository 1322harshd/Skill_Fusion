import hashlib
from .prompts import week_prompt, milestone_prompt
from apps.prompt_engineering.llm_client import call_sf14b

def fallback(a,b,text):
    seed=hashlib.md5(f"{a}×{b}{text[:10]}".encode()).hexdigest()
    h=int(seed[:2],16)
    clarity=["Clear","Tight","Specific"][h%3]
    notes=[f"You connected {a} and {b} in one line — that's the whole trick.", "Good instinct. Tightening it to one concrete sentence will land harder.", "That reads genuine, which beats polished. One example would seal it."]
    sugs=[f"Add one small detail only someone with the {a} × {b} blend would know.", f'Rewrite it as: "I did X using {a}, and it changed how we do {b}."', "End on the outcome — what changed because you shipped it."]
    return {"clarity":clarity, "note":notes[h%3], "suggestion":sugs[(h>>3)%3]}

async def explain_feedback(a,b, text, context="week"):
    prompt = milestone_prompt(a,b,text) if context=="milestone" else week_prompt(a,b,text)
    try:
        raw = await call_sf14b(adapter="sf-fusion", prompt=prompt)
        import json
        return __import__("apps.prompt_engineering.schemas", fromlist=["ExplainSchema"]).ExplainSchema.model_validate_json(raw).model_dump()
    except Exception:
        return fallback(a,b,text)
