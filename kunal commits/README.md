# Kunal Commits — AI Core

**Owner:** Kunal  
**Stack:** Django 5 + Django REST Framework + Postgres 15 + pgvector + Ollama SF:14B (resident) + Tailscale  
**Frontend integration:** `app_v7/src/app/store.js` (`makeFusion`, `makeRoadmap`, `makeScore`, `makeBrief`, `explainFeedback`), `Roadmaps.js` (3 previews, expansion, regeneration), `Project.js`, `ScoreScreen.js`, `ExplainPanel.js`, `Fuse.js`, `Onboarding.js` quiz

This folder is the **backend scaffold ready to be plugged into SF:14B** — frontend is mostly done (`app_v7/`). Each `01_...` folder is a docs mirror; **real code lives in `backend/`** (Django project `skillfusion` + `apps/`). Each app has `models.py` + `views.py` + `prompts.py` + `serializers` + mocked LLM that will switch to `ollama run mada-sf-14b` via `/api/llm/generate` once SF:14B is trained. Fully working with rule-based fallbacks now.

Structure:
- `01_ai-skill-fusion-engine` → `backend/apps/fusion_engine` — fusion `a×b` engine + quiz logic (5Q baseline)
- `02_learning-roadmap-generator` → `backend/apps/roadmaps` — 3 previews, expansion (4 of N + forest), regeneration (salt rotate)
- `03_project-generator` → `backend/apps/projects` — flagship project brief (goal/tools/deliverables)
- `04_fusion-score` → `backend/apps/scores` — job-data pipeline (Adzuna 12k) + embedding similarity (pgvector) for rarity/demand
- `05_explain-it-prompts` → `backend/apps/explain` — ExplainPanel prompts per week/milestone
- `06_prompt-engineering-structured-output` → `backend/apps/prompt_engineering` — all prompt templates + Pydantic schemas + retry validation
- `07_ollama-tailscale-infra` → `backend/apps/infra` — resident `SF:14B` + embedding `nomic-embed` via Ollama + Tailscale tunnel
- `backend/` — Django project `skillfusion` (`settings.py`, `urls.py`, `manage.py`, `requirements.txt`)

All **Django + Postgres** (psycopg2, pgvector), `POST /api/*` contracts match `Store` shapes. No AI model required to run — mocks return same shape as SF:14B will.

> Backend scaffold here mirrors the intended stack in Harsh's repo `https://github.com/1322harshd/Skill_Fusion` (now **Django + Postgres** per your update, not Prisma) — ready to be plugged in when SF:14B is trained, fully working with fallbacks now.
