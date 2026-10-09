# Skill_Fusion
Skill Fusion AI turns any combination of skills you choose into a market-scored learning roadmap, a real project, and a ready resume — powered by a fully self-hosted AI stack.

## Project status

This is a capstone project under active development. The table below reflects what's actually wired to a real backend versus what's still frontend-only demo data.

### Built end-to-end (real backend + tests)

- **Authentication** — register, login, JWT access token + httpOnly refresh cookie, logout, password reset, email verification.
- **GitHub OAuth connect** — a logged-in user can connect their real GitHub account (`repo` scope). The connection is verified by GitHub, not a free-text field, and the access token is never returned by the API.
- **Growth Log** — manual entries, credential link verification, and GitHub repo import (including private repos once connected). Entries from private repos are flagged in the UI. Verified / self-reported / pending status is rendered by one shared component (`window.LogSourceBadge`) used on both the Growth Log page and the Dashboard, so the two can't silently drift apart.
- **GitHub contribution graph** — real commit activity pulled from GitHub's GraphQL API, combined with manually logged entries into one activity heatmap.
- **Resume & Cover Letter generator** — grounded in the user's actual Growth Log entries (not invented), optionally targeted at a pasted job listing, generated via a self-hosted LLM over an OpenAI-compatible `/v1/chat/completions` endpoint. Exports to PDF server-side (`reportlab`).

### Frontend-only demo data (no backend yet)

The following screens exist and render, but run on mock data generated in `frontend/src/app/store.js` / `fusion.js` rather than a real API: Fuse (skill-combination engine), Roadmaps, Fusion Score, Posts, Connect (peer matching), and the Dashboard's summary stats. These are the next planned backend work.

### Testing

- **Backend:** 34 Django tests (`authentication`, `growthlog`, `resume`) covering auth, ownership scoping, the GitHub OAuth flow (mocked), the private-repo import gate, and the resume generator's JSON parsing against a real failure mode (model truncation / reasoning-field residue), all without calling the real LLM. Linted with `ruff`.
- **Frontend:** 16 Playwright end-to-end tests (landing nav, onboarding, Growth Log, app shell, resume generation) against a mocked API, no backend required to run them. Linted with `eslint`.
- **CI:** two GitHub Actions workflows (`backend-ci-pipeline.yml`, `frontend-ci-pipeline.yml`), each lint-then-test, triggered on push/PR to their own folder, with lint and coverage/test reports uploaded as artifacts.

### Known gaps

- The frontend has no build step (plain `<script>` tags + in-browser Babel), so it's only deployable as static files pointed at a running backend — not yet deployed anywhere public.
- GitHub access tokens are stored in plaintext in the database; acceptable for local development, not for production.
- The LLM endpoint (`LLM_API_URL`) is a shared dev server on a private Tailscale network — it isn't reachable from CI or from a public deployment, so the resume generator currently only works on machines with access to that network.
- No CD/deploy step yet — CI currently only lints, tests, and reports.
