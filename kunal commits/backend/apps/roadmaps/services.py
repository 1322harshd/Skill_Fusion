import hashlib
CURATED = {"Design×Code":"Ship a product you designed end-to-end","Marketing×Data":"Run campaigns you can prove worked"}
GENERIC = [lambda a,b: f"Do {b} work that carries your {a} edge", lambda a,b: f"Turn your {a} instinct into {b} results", lambda a,b: f"Become the rare {a} + {b} hire"]
def hash(s):
    h=0
    for ch in str(s): h=(h*31+ord(ch)) & 0xFFFFFFFF
    return abs(h)
def make_roadmap(a,b, opts=None):
    opts=opts or {}
    seed=hash(a+'×'+b+(f"-{opts.get('salt')}" if opts.get('salt') is not None else ''))
    n=opts.get('totalWeeks') or 6+(seed%3)
    title=opts.get('title') or CURATED.get(f"{a}×{b}") or GENERIC[seed%len(GENERIC)](a,b)
    topics=[lambda i: f"Get fluent in {b}, applied to {a}", lambda i: f"First artifact — a small {b} piece with your {a} fingerprint", lambda i: f"Core skill — the {b} patterns most {a} people miss", lambda i: f"Your style — where {a} meets {b}", lambda i: "The flagship project brief", lambda i: "Ship it — build, refine, document", lambda i: "Publish + sync to GitHub — earn the verified badge", lambda i: "Positioning — portfolio, interviews, next moves"]
    weeks=[]
    for i in range(n):
        wk=i+1
        weeks.append({"n":wk,"title": topics[i%len(topics)](i), "objectives":[ f"Name the three things {a} gives {b} work" if i==0 else f"Apply {b} to one {a} scenario", f"Skim five real listings that want this blend" if i==0 else "Collect one example"], "status": "done" if wk<1 else "current" if wk==1 else "upcoming", "tasks": [{"id":f"t{wk}a","label":f"Complete the {a} piece for week {wk}","done":False},{"id":f"t{wk}b","label":"Reflect and log one note in your Growth Log","done":True}] if wk==1 else []})
    return {"title":title,"weeks":weeks,"progressWeeks":1,"totalWeeks":n,"paused":False}
import asyncio, json
try:
    from apps.prompt_engineering.llm_client import call_sf14b, call_sf14b_json
except ImportError:  # direct module use
    from prompt_engineering.llm_client import call_sf14b, call_sf14b_json

PREVIEWS_SHAPE = ('{"previews": [{"title": string, "summary": string, "weeks": integer, '
    '"outcomes": [string, string], "roadmap": {"title": string, "weeks": '
    '[{"week": integer, "topic": string, "objectives": [string]}], '
    '"outcome_statement": string}}]}')

def get_previews(fusion, salt=0):
    a, b = fusion["a"], fusion["b"]
    # Call 1 (short): 3 preview shells only — full roadmaps derail mid-object.
    shells_prompt = (
        f'List 3 learning roadmap previews combining "{a}" and "{b}" (set {salt}). '
        'Return ONLY valid JSON: '
        '{"previews": [{"title": string, "summary": string, "weeks": integer, '
        '"outcomes": [string, string]}]}')
    shells = asyncio.run(call_sf14b_json("sf-roadmap", shells_prompt))["previews"]
    assert len(shells) == 3, "expected 3 previews"
    # Calls 2-4 (medium): expand weeks per preview.
    out = []
    for i, s in enumerate(shells):
        wp = (f'Roadmap "{s["title"]}" ({a} + {b}), exactly {s["weeks"]} weeks. '
            'Return ONLY valid JSON: {"title": string, '
            '"weeks": [{"week": integer, "topic": string, "objectives": [string, string]}], '
            '"outcome_statement": string}')
        detail = asyncio.run(call_sf14b_json("sf-roadmap", wp, max_tokens=1200))
        out.append({"id": f"pv{i}-{salt}", "title": s["title"], "summary": s["summary"],
                    "weeks": s["weeks"], "outcomes": s["outcomes"], "roadmap": detail})
    return out
