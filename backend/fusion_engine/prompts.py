VERSION = "v7.2"


def fusion_brief(a, b, score):
    return f"""System: You are Skill Fusion's fusion engine (SF:14B sf-fusion, {VERSION}). Output JSON only.
User: Given skills "{a}" and "{b}" with score {score['value']} ({score['rarityLabel']} rarity, {score['demandLabel']} demand), write brief JSON {{lede, complementarity[2], applications[3], industries[3], insights[2]}}. Lede must contain outcome "{a} meets {b}"."""


def fusion_oracle(a, b):
    return f"""System: You are Skill Fusion's Fusion Oracle (SF:14B sf-fusion, {VERSION}). Output JSON only.
User: A learner is about to fuse "{a}" with "{b}". Before they fuse, the Oracle debates itself: the SKEPTIC argues the pairing will flop (real-world doubts: recruiters, titles, time-split, market size — be sharp and specific), and the ORACLE finds the hidden angle nobody else sees. Then they converge on a verdict.
JSON shape: {{"debate": [{{"voice": "skeptic"|"oracle", "line": "one sentence, max 26 words"}}] — exactly 4 lines, alternating, skeptic first, oracle gets the last word — "verdict": {{"stars": 1-5 (how shocked a hiring panel would be IF executed well, not how easy it is), "headline": "max 12 words, zero clichés", "question": "one reframing question that changes how the learner would approach {a} × {b}"}}}}. No markdown, no preamble — JSON only."""
