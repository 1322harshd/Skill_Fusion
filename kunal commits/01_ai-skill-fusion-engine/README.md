# 01 — AI Skill Fusion Engine (incl. Quiz Logic)

**Frontend:** `app_v7/src/app/Onboarding.js` (baseline quiz), `Fuse.js` (pick a×b), `store.js:143 fuse()` 

**Real code:** `backend/apps/fusion_engine/` — Django app `fusion_engine` (models `Fusion`, `prompts.py`, `schemas.py`, `services.py` `make_brief`, `quiz.py` 5Q, `views.py` `POST /api/fusion` + `/quiz/*`, `urls.py`). See `backend/apps/fusion_engine/` for implementation. This folder is docs mirror.

**API:** `POST /api/fusion/` {a,b} → {fusion}, `POST /api/fusion/quiz/generate/` {skills} → {questions}, `POST /api/fusion/quiz/submit/` {answers} → {levels}
