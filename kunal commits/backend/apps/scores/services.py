import hashlib, json
def hash(s):
    h=0
    for ch in str(s): h=(h*31+ord(ch)) & 0xFFFFFFFF
    return abs(h)

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
    skill=pick if pick not in (a,b) else pool[(seed>>9)%len(pool)]
    delta=8+((seed>>3)%9)
    return {"value":value,"rarity":rarity,"demand":demand,"rarityLabel":rarityLabel,"demandLabel":demandLabel,"explanation":explanation,"recommendation":{"skill":skill,"delta":delta,"category":cat},"history":[value]}

# async version for future pgvector
async def make_score(a,b):
    return make_score_sync(a,b)
