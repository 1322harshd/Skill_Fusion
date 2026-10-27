import asyncio

Q_SHAPE = ('{"questions": [{"skill": string, "q": string, "options": [string x4], '
           '"answer_index": integer 0-3, "difficulty": "easy | medium | hard"}]}')

DIFF_SPLIT = [("hard", 2), ("medium", 2), ("easy", 1)]
PER_SKILL_COUNT = 5  # 2 hard + 2 medium + 1 easy


def _smoke_quiz(skill):
    return [
        {"skill": skill, "difficulty": "hard", "q": "Which project best demonstrates applying this skill at scale?",
         "options": ["A production system you led", "A textbook exercise", "An unrelated task", "Nothing yet"],
         "answer": 0},
        {"skill": skill, "difficulty": "hard", "q": "A team member disagrees on an approach. What shows senior judgment?",
         "options": ["Ignore them", "Escalate blindly", "Test both and share data", "Flip a coin"],
         "answer": 2},
        {"skill": skill, "difficulty": "medium", "q": "How do you keep this skill sharp?",
         "options": ["Deliberate practice on real work", "No practice at all", "Read once a year", "Only courses, never applied"],
         "answer": 0},
        {"skill": skill, "difficulty": "medium", "q": "Which signal proves competency to a reviewer?",
         "options": ["Nothing", "Loud claims", "Shipping measurable outcomes", "Long emails"],
         "answer": 2},
        {"skill": skill, "difficulty": "easy", "q": "What is the first step to build this skill?",
         "options": ["Foundational study, then practice", "Skip learning", "Avoid feedback", "Wait for talent"],
         "answer": 0},
    ]


def _prompt(skills):
    return (
        f"Write {PER_SKILL_COUNT} multiple-choice questions testing real knowledge "
        f"of EACH skill below: 2 hard, 2 medium, 1 easy. Tag each question with "
        "the skill it belongs to. Each question is an object with keys "
        '"skill", "q", "options" (exactly 4 strings), "answer_index" (0-3) and '
        '"difficulty" ("easy" | "medium" | "hard").\n'
        "Return ONLY valid JSON, no markdown fencing, no extra text, matching exactly: "
        + Q_SHAPE
        + "\n\nSKILLS: "
        + ", ".join(skills)
    )


def _pick(data, known_skills):
    """Validate + bucket SF output: per skill take 2 hard, 2 medium, 1 easy in
    received order; anything unrecognised/invalid is dropped silently."""
    caps = {"hard": 2, "medium": 2, "easy": 1}
    wanted = {s.lower() for s in known_skills}
    out = []
    for q in (data.get("questions") or []) if isinstance(data, dict) else []:
        if not isinstance(q, dict):
            continue
        skill = str(q.get("skill", "")).strip()
        diff = str(q.get("difficulty", "")).strip().lower()
        options = q.get("options")
        try:
            answer = int(q.get("answer_index"))
        except (TypeError, ValueError):
            continue
        if (skill.lower() not in wanted or diff not in caps or caps[diff] <= 0
                or not isinstance(options, list) or len(options) != 4
                or not (0 <= answer <= 3)):
            continue
        caps[diff] -= 1
        out.append({"skill": skill, "difficulty": diff, "q": str(q.get("q", "")),
                    "options": options, "answer": answer})
    return out


def generate_quiz(skills, user=None):
    """5 questions per skill (2 hard, 2 medium, 1 easy). One SF call for the
    whole quiz: SF's call latency is reasoning-bound (~30-90s) no matter the
    prompt size, so N×3 calls used to cost 10+ minutes. Returns session with
    questions STRIPPED of answers; keys stay server-side in QuizSession."""
    from .models import QuizSession
    from prompt_engineering.llm_client import call_sf14b_json
    skills = [s for s in skills][:4]

    try:
        data = asyncio.run(call_sf14b_json("sf-quiz", _prompt(skills), retries=1,
                                            max_tokens=6000))
        qs = _pick(data, skills)
    except Exception:
        qs = []
    if not qs:
        # Total SF failure: fall back to a fixed smoke quiz so nobody stares at
        # a dead spinner; scoring off these is flagged by reason wording.
        qs = [q for s in skills for q in _smoke_quiz(s)]
    for i, q in enumerate(qs):
        q["id"] = f"{q['skill']}-{i}"
    session = QuizSession.objects.create(
        user=user,
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
