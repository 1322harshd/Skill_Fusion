# 07 — Ollama / Tailscale Infra

**Real code:** `backend/apps/infra/` + `backend/skillfusion/settings.py` `OLLAMA_URL`/`EMBED_MODEL` + `docker-compose.yml` (`ollama:11434` + `pgvector:5432` + `tailscale`) + `Modelfile` (`FROM qwen2.5:14b` + `ADAPTER sf-fusion/post` + `MM_PROJ siglip`, `num_ctx 8192`) + `embeddings.js` (`nomic-embed-text`) + `tailscale.sh`. Resident `SF:14B Q4 9.3GB` 51MB idle. This folder is docs mirror — real infra in `backend/apps/infra/`.
