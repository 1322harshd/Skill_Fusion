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
def get_previews(fusion, salt=0):
    baseWeeks=fusion["roadmap"]["totalWeeks"]
    variants=[
        {"title":fusion["roadmap"]["title"],"summary":"The flagship path — follow the brief to a shipped, verified artifact.","weeks":baseWeeks,"outcomes":["Ship one verified artifact from the brief","Reach your first fusion-score milestone"]},
        {"title":f"Become the {fusion['a']}-minded {fusion['b']} hire","summary":"Position for roles that want this exact blend on a team.","weeks":4+((hash(fusion['a']+fusion['b'])+salt)%4),"outcomes":["Build a role-ready portfolio story","Get real replies in "+fusion['a']+" × "+fusion['b']+" roles"]},
        {"title":f"Turn {fusion['a']} × {fusion['b']} into a service","summary":"Package the rare pair into an offering you can sell.","weeks":6+((hash(fusion['a']+"x"+fusion['b'])>>2)%3),"outcomes":["Package the pair into a sellable offering","Land your first paying project"]},
    ]
    rot=((salt%3)+3)%3
    ordered=variants[rot:]+variants[:rot]
    return [{"id":f"pv{i}-{salt}","title":v["title"],"summary":v["summary"],"weeks":v["weeks"],"outcomes":v["outcomes"],"roadmap": make_roadmap(fusion['a'],fusion['b'],{"title":v["title"],"totalWeeks":v["weeks"],"salt":salt+i})} for i,v in enumerate(ordered)]
