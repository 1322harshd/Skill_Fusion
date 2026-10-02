import hashlib
def hash(s):
    h=0
    for ch in str(s): h=(h*31+ord(ch)) & 0xFFFFFFFF
    return abs(h)
def category_of(name):
    # simplified
    return "tech"
def make_project(a,b):
    seed=hash(a+'×'+b)
    formats=["Portfolio artifact","Product prototype","Case study","Launch piece"]
    fmt=formats[seed%len(formats)]
    tools=[a,b,"GitHub","Notion"]
    if category_of(a)=="tech": tools.append("API docs")
    return {"title":f"{a} × {b} — the flagship piece","client":"Modeled on hiring-manager needs","timeline":f"{4+(seed%3)} weeks","format":fmt,"audience":"Future teammates and hiring managers","goal":f"{a} meets {b}: build the one piece that proves this combination earns a place on a team.","tools":list(dict.fromkeys(tools)),"deliverables":["Working artifact","Short write-up","Published link"],"expectedOutcome":"A piece you can open in interviews — and the verified badge that comes from shipping it."}
