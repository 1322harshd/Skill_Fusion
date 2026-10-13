# 04 — Fusion Score

**Frontend:** `ScoreScreen.js` (gauge, SignalCard, weights 45/55, history)

**Real code:** `backend/apps/scores/` — `services.py` `make_score_sync` (rarity pgvector nomic-embed + demand Adzuna 12k), `jobs_pipeline.py`, `embeddings` via `backend/apps/infra`. This folder is docs mirror. History now `[value]` only.
