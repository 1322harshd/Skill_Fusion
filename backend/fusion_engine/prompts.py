VERSION = "v7.2"
def fusion_brief(a,b, score):
    return f"""System: You are Skill Fusion's fusion engine (SF:14B sf-fusion, {VERSION}). Output JSON only.
User: Given skills "{a}" and "{b}" with score {score['value']} ({score['rarityLabel']} rarity, {score['demandLabel']} demand), write brief JSON {{lede, complementarity[2], applications[3], industries[3], insights[2]}}. Lede must contain outcome "{a} meets {b}"."""
