import asyncio

Q_SHAPE = ('{"questions": [{"q": string, "options": [string x4], '
           '"answer_index": integer 0-3, "difficulty": "easy | medium | hard"}]}')

DIFF_SPLIT = [("hard", 2), ("medium", 2), ("easy", 1)]


def _gen_skill(skill):
    from prompt_engineering.llm_client import call_sf14b_json
    qs = []
    for diff, count in DIFF_SPLIT:
        prompt = (
            f'Write {count} {diff} multiple-choice questions testing real '
            f'"{skill}" knowledge. Return ONLY valid JSON, no markdown fencing, '
            f'no extra text, matching exactly: {Q_SHAPE}')
        data = asyncio.run(call_sf14b_json("sf-quiz", prompt))
        for q in data["questions"][:count]:
            assert q["difficulty"] == diff, f"wrong difficulty for {skill}"
            assert 0 <= q["answer_index"] <= 3 and len(q["options"]) == 4
            qs.append({"skill": skill, "difficulty": diff, "q": q["q"],
                       "options": q["options"], "answer": q["answer_index"]})
    return qs


def generate_quiz(skills):
    """5 questions per skill (2 hard, 2 medium, 1 easy). Returns session with
    questions STRIPPED of answers; keys stay server-side in QuizSession."""
    from .models import QuizSession
    skills = [s for s in skills][:4]
    qs = []
    for skill in skills:
        for i, q in enumerate(_gen_skill(skill)):
            q["id"] = f"{skill}-{i}"
            qs.append(q)
    session = QuizSession.objects.create(
        skills=skills,
        questions=[{**q} for q in qs],
    )
    public = [{k: q[k] for k in ("id", "skill", "difficulty", "q", "options")} for q in qs]
    return {"session_id": session.id, "questions": public}


def score_quiz(session_id, answers):
    """Each correct answer = 2 marks; level per skill = correct*2 on 0-10
    (floored at 1), saved on the session."""
    from .models import QuizSession
    session = QuizSession.objects.get(id=session_id)
    key = {(q["skill"], q["id"]): q["answer"] for q in session.questions}
    by = {}
    for a in answers:
        for (skill, qid), ans in key.items():
            if qid == a.get("id"):
                st = by.setdefault(skill, {"correct": 0, "total": 0})
                st["total"] += 1
                if a.get("choice") == ans:
                    st["correct"] += 1
    levels = [{"label": k, "level": max(1, v["correct"] * 2),
               "levelSource": "quiz",
               "reason": f"Quiz: {v['correct']}/{v['total']} correct × 2 marks"}
              for k, v in by.items()]
    session.answers = answers
    session.levels = levels
    session.save(update_fields=["answers", "levels"])
    return levels
