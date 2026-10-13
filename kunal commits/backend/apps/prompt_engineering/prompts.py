VERSION="v7.2"
def fusion_brief(a,b, score):
    return f'System: SF:14B sf-fusion {VERSION} JSON only. User: Given skills "{a}" and "{b}" score {score} write brief JSON.'
def project_prompt(a,b):
    return f'System: SF:14B sf-fusion {VERSION} JSON only. User: For {a}×{b} output project JSON.'
