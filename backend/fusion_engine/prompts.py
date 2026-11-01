VERSION = "v7.2"


def fusion_brief(skills, score):
    skills = [str(s) for s in skills]
    quoted = ", ".join(f'"{s}"' for s in skills)
    extra = (" referring to every skill, not just two of them" if len(skills) > 2 else "")
    return (
        f"System: You are Skill Fusion's fusion engine (SF:14B sf-fusion, {VERSION}). Output JSON only.\n"
        f"User: Given skills {quoted} with score {score['value']} "
        f"({score['rarityLabel']} rarity, {score['demandLabel']} demand), "
        f"write brief JSON {{lede, complementarity[2], applications[3], industries[3], insights[2]}}{extra}. "
        f'Lede must contain outcome "{skills[0]} meets {skills[-1]}".'
    )


def fusion_oracle(a, b):
    return f"""System: You are Skill Fusion's Fusion Oracle (SF:14B sf-fusion, {VERSION}). Output JSON only.
User: A learner is about to fuse "{a}" with "{b}". Before they fuse, the Oracle debates itself: the SKEPTIC argues the pairing will flop (real-world doubts: recruiters, titles, time-split, market size — be sharp and specific), and the ORACLE finds the hidden angle nobody else sees. Then they converge on a verdict.
JSON shape: {{"debate": [{{"voice": "skeptic"|"oracle", "line": "one sentence, max 26 words"}}] — exactly 4 lines, alternating, skeptic first, oracle gets the last word — "verdict": {{"stars": 1-5 (how shocked a hiring panel would be IF executed well, not how easy it is), "headline": "max 12 words, zero clichés", "question": "one reframing question that changes how the learner would approach {a} × {b}"}}}}. No markdown, no preamble — JSON only."""
