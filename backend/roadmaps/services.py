import asyncio
from prompt_engineering.llm_client import call_sf14b_json

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
        detail = asyncio.run(call_sf14b_json("sf-roadmap", wp, max_tokens=3000))
        out.append({"id": f"pv{i}-{salt}", "title": s["title"], "summary": s["summary"],
                    "weeks": s["weeks"], "outcomes": s["outcomes"], "roadmap": detail})
    return out

TWEAK_SHAPE = ('{"change_request": string, "classification": "acceptable | not_acceptable", '
    '"reasoning": string, "skill_a_still_present": boolean, "skill_b_still_present": boolean, '
    '"diff": [{"field": string, "before": string, "after": string}]}')

def tweak_roadmap(roadmap_record, constraints, skill_a, skill_b, request):
    """Pre-commit tweak per spec: skill-presence test, diff drives strikethrough UI."""
    import asyncio as _a, json as _j
    from prompt_engineering.llm_client import call_sf14b_json
    prompt = (
        f'Roadmap titled "{roadmap_record["title"]}" combining "{skill_a}" and "{skill_b}". '
        f'Weeks: {_j.dumps(roadmap_record.get("weeks", []))}. '
        f'Accumulated constraints this session: {constraints if constraints else "none"}. '
        f'New change request: "{request}". '
        'Judge by ONE rule: acceptable only if the roadmap still meaningfully engages BOTH '
        'original skills; not acceptable if it removes or effectively erases either one. '
        'If acceptable, list only actually-changed fields in diff. '
        f'Return ONLY valid JSON: {TWEAK_SHAPE}')
    return _a.run(call_sf14b_json("sf-roadmap-tweak", prompt))
