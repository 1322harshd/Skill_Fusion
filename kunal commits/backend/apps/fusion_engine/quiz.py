QUIZ_BANK = {
 "Design": ["Which contrast ratio passes WCAG AA?","Figma auto-layout vs constraints?","When to use 8pt grid?","Heuristic: recognition vs recall?","Prototyping fidelity trade-off?"],
 "Code": ["Closure vs scope?","Event loop microtask order?","SQL JOIN vs subquery?","REST idempotency of PUT?","Git rebase vs merge?"],
 "Marketing": ["CAC vs LTV?","Attribution last-click flaw?","A/B test p=0.06?","Funnel drop 40% where?","SEO canonical?"],
 "Data": ["p-value 0.04 means?","JOIN vs WINDOW?","Bias vs variance?","Outlier IQR rule?","SQL HAVING vs WHERE?"],
}

def generate_quiz(skills):
    qs=[]
    for skill in skills:
        bank = QUIZ_BANK.get(skill, QUIZ_BANK["Design"])
        for i in range(5):
            qs.append({"id": f"{skill}-{i}", "skill": skill, "q": bank[i%len(bank)], "options": ["A) ...","B) ...","C) ...","D) ..."]})
    return {"questions": qs[:10]}

def score_quiz(answers):
    by={}
    for a in answers:
        skill=a["id"].split("-")[0]
        by.setdefault(skill, {"correct":0,"total":0})
        by[skill]["total"]+=1
        if a.get("choice")==0: by[skill]["correct"]+=1
    return [{"label": k, "level": max(1, round(v["correct"]/v["total"]*10)), "levelSource":"quiz", "reason":"Quiz baseline"} for k,v in by.items()]
