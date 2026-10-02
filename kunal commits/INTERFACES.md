# Interface Agreements (Kunal → Harsh, for checkin approval)

Per the team charter, these cross-boundary shapes are agreed BEFORE building on them.
Status: PROPOSED by Kunal — Harsh to confirm or redline.

## 1. Fusion Engine output → Dashboard (Harsh)
`POST /api/llm/generate/` with `{"adapter": "sf-fusion", "prompt": <fusion prompt>}`
returns `{"response": "<JSON string>"}` where the JSON is exactly:
```json
{
  "skill_a": "string", "skill_b": "string",
  "complementarity": "string",
  "real_world_applications": ["string ×3+"],
  "relevant_industries": ["string ×2"],
  "fusion_insights": "string"
}
```
Verified live against SF (105/121 held-out). Dashboard can parse these keys directly.
Needs from Harsh: confirm Dashboard reads these keys (or list the keys it needs).

## 2. Project Review inputshape (needs Harsh's Growth Log shape)
Review consumes:
```json
{
  "project_brief": {"title": str, "fusion_pair": [a, b],
                    "key_deliverables": [str ×3], "expected_outcome": str},
  "submission": {"text_description": str, "attachments": [image_url]}
}
```
Needs from Harsh: confirm Growth Log stores submissions in this shape
(or send me the actual shape and I adapt the Review prompt).

## 3. Shared PostgreSQL tables (Kunal's apps)
Proposed new tables (migrations to follow once agreed):
- `fusion_session(id, user_id, skill_a, skill_b, brief_json, score, created_at)`
- `roadmap(id, session_id, preview_json, constraints_json[], chosen, locked_at)`
- `project_review(id, session_id, submission_json, grade_json, score_0_100, flagged)`
- `fusion_score_cache(skill_a, skill_b, score_json, computed_at)` (scores recomputed weekly)
Needs from Harsh: confirm no table-name clashes with auth/growthlog/resume apps;
agree `user_id` foreign-key convention.

## 4. Model endpoints (informational — Kunal's infra)
- SF (chat/generation): `http://localhost:8081/v1/chat/completions`
  (model id `models/gemma4-12b-it-4bit`, `enable_thinking: false` for strict tasks)
- Embeddings: `http://localhost:11434/api/embed` (model `nomic-embed-text`, 768-dim)
  for Fusion Score pgvector similarity. Env-overridable via `SF_URL`.
