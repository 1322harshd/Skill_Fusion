import asyncio
from prompt_engineering.llm_client import call_sf14b_json

PREVIEWS_SHAPE = ('{"previews": [{"title": string, "summary": string, "weeks": integer, '
    '"outcomes": [string, string], "roadmap": {"title": string, "weeks": '
    '[{"week": integer, "topic": string, "objectives": [string]}], '
    '"outcome_statement": string}}]}')

def _joint(skills):
    """'"a" and "b"' for pairs, '"a", "b" and "c"' for trios."""
    return " and ".join(f'"{s}"' for s in skills)


def _fallback_previews(a, b, salt, third=None):
    """No-AI contingency: keeps Select-a-path reachable when SF is fully
    down (server stopped, model reload, network failure). Deterministic,
    honest structurally-complete previews; never used in normal operation."""
    tail = f", with {third} woven in" if third else ""
    def weeks(n, topics):
        return [{"week": i + 1, "topic": t, "objectives": [
            f"Study one {a} technique applied to {b}" + (f" and {third}" if third else ""),
            "Build a small exercise combining the two" if not third else "Build a small exercise combining all three"]}
            for i, t in enumerate(topics)]
    themes = [
        {"title": f"Foundations: {a} Practice with {b}" + (f" (and {third})" if third else ""),
         "summary": f"A step-by-step path building your {a} core, with {b} applied from week one{tail} so neither skill sits idle.",
         "n": 4, "topics": ["Fundamentals refresher", "First combined exercise", "Core project build", "Review and polish"]},
        {"title": f"Integration Sprint: {a} × {b}" + (f" × {third}" if third else ""),
         "summary": f"A fast, project-first route: pick a deliverable that forces {a} and {b}{tail} together and build it weekly.",
         "n": 3, "topics": ["Choose the deliverable", "Build the first working version", "Refine and ship it"]},
        {"title": f"Applied Portfolio: {a} meets {b}",
         "summary": f"Longer pace with emphasis on finished, showable work — each month of effort ends in a portfolio-ready {a}+{b}{tail if not third else '+' + third} artifact.",
         "n": 6, "topics": ["Scoping and setup", "Week 2 build", "Week 3 build", "Week 4 build", "Week 5 build", "Final polish and write-up"]},
    ]
    out = []
    for i, t in enumerate(themes):
        out.append({"id": f"pv{i}-{salt}", "fallback": True,
                    "title": t["title"], "summary": t["summary"],
                    "weeks": t["n"],
                    "outcomes": [f"Use {a} and {b}" + (f" and {third}" if third else "") + " together on a real artifact",
                                 "Show the finished work in your Growth Log"],
                    "roadmap": {"title": t["title"], "weeks": weeks(t["n"], t["topics"]),
                                "outcome_statement": f"You can demonstrably use {a} and {b}" + (f" and {third}" if third else "") + " together by the end."}})
    return out


def _weeks_core(n, a, b, third=None):
    """Deterministic week scaffold used when one detail call fails mid-set."""
    capped = max(2, min(int(n or 4), 12))
    plans = ["Plan and scope the work"] + [f"Build block {i+1}" for i in range(capped - 1)] \
        if capped <= 5 else None
    topics = plans or (["Scoping and setup"] + [f"Week {w} build" for w in range(2, capped)]
                       + ["Polish and wrap up"])[:capped]
    return [{"week": i + 1, "topic": t, "objectives": [
        f"Apply one concrete {a} technique",
        f"Connect it to {b}" + (f" and {third}" if third else "") + " in what you build"]} for i, t in enumerate(topics)]


def get_previews(fusion, salt=0):
    skills = [fusion["a"], fusion["b"]]
    third = fusion.get("third")
    if third and third not in skills:
        skills.append(third)
    a, b = skills[0], skills[-1]
    listed = _joint(skills)
    weave = (" The previews must genuinely weave all three skills in, not just two."
             if len(skills) > 2 else "")
    try:
        # Call 1 (short): 3 preview shells only — full roadmaps derail mid-object.
        shells_prompt = (
            f'List 3 learning roadmap previews combining {listed} (set {salt}).{weave} '
            'Return ONLY valid JSON: '
            '{"previews": [{"title": string, "summary": string, "weeks": integer, '
            '"outcomes": [string, string]}]}')
        shells = asyncio.run(call_sf14b_json("sf-roadmap", shells_prompt))["previews"]
        shells = shells[:3]
    except Exception:
        # SF down after all retries — serve the offline set instead of a dead end.
        return _fallback_previews(a, b, salt, third=third)
    # Calls 2-4 (medium): expand weeks per preview.
    sig = " + ".join(skills)
    out = []
    for i, s in enumerate(shells):
        try:
            wp = (f'Roadmap "{s["title"]}" ({sig}), exactly {s["weeks"]} weeks. '
                'Return ONLY valid JSON: {"title": string, '
                '"weeks": [{"week": integer, "topic": string, "objectives": [string, string]}], '
                '"outcome_statement": string}')
            detail = asyncio.run(call_sf14b_json("sf-roadmap", wp, max_tokens=3000))
        except Exception:
            detail = {"title": f"{s['title']} ({sig})",
                      "weeks": _weeks_core(s.get("weeks", 4), a, b, third=third),
                      "outcome_statement": "Practical, weekly progress in " + " and ".join(skills) + "."}
            fallback = True
        else:
            fallback = False
        out.append({"id": f"pv{i}-{salt}", "title": s["title"], "summary": s["summary"],
                    "weeks": s["weeks"], "outcomes": s["outcomes"], "roadmap": detail,
                    **({"fallback": True} if fallback else {})})
    return out

TWEAK_SHAPE = ('{"change_request": string, "classification": "acceptable | not_acceptable", '
    '"reasoning": string, "skill_a_still_present": boolean, "skill_b_still_present": boolean, '
    '"diff": [{"field": string, "before": string, "after": string}]}')

def tweak_roadmap(roadmap_record, constraints, skill_a, skill_b, request, skill_c=None):
    """Pre-commit tweak per spec: skill-presence test, diff drives strikethrough UI."""
    import asyncio as _a, json as _j
    from prompt_engineering.llm_client import call_sf14b_json
    listed = f'"{skill_a}" and "{skill_b}"' + (f' and "{skill_c}"' if skill_c else "")
    present_rule = ("still meaningfully engages BOTH original skills"
                    if not skill_c else
                    "still meaningfully engages ALL THREE skills")
    prompt = (
        f'Roadmap titled "{roadmap_record["title"]}" combining {listed}. '
        f'Weeks: {_j.dumps(roadmap_record.get("weeks", []))}. '
        f'Accumulated constraints this session: {constraints if constraints else "none"}. '
        f'New change request: "{request}". '
        f'Judge by ONE rule: acceptable only if the roadmap {present_rule}; '
        'not acceptable if it removes or effectively erases any one of them. '
        'If acceptable, list only actually-changed fields in diff. '
        f'Return ONLY valid JSON: {TWEAK_SHAPE}')
    return _a.run(call_sf14b_json("sf-roadmap-tweak", prompt))
