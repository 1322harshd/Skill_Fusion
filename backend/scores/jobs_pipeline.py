"""Phase 6 vertical slice: job fetch -> nomic embeddings -> pgvector store.

Two free sources:
  - arbeitnow: completely free, no key, remote-tech board (default)
  - adzuna: needs ADZUNA_ID / ADZUNA_KEY env (https://developer.adzuna.com),
    but supports per-country listings (NZ by default)
Embeddings via Ollama nomic-embed-text (:11434) — best-effort at ingest;
without them the demand side of the score still works (see services.py).
"""
import os, requests

ADZUNA_ID = os.getenv("ADZUNA_ID")
ADZUNA_KEY = os.getenv("ADZUNA_KEY")
ADZUNA_COUNTRY = os.getenv("ADZUNA_COUNTRY", "nz")
EMBED_URL = os.getenv("EMBED_URL", "http://localhost:11434")


def fetch_jobs(query, max_results=50):
    if not ADZUNA_ID or not ADZUNA_KEY:
        raise RuntimeError("ADZUNA_ID/ADZUNA_KEY not set — cannot fetch job data")
    out, page = [], 1
    while len(out) < max_results:
        r = requests.get(
            f"https://api.adzuna.com/v1/api/jobs/{ADZUNA_COUNTRY}/search/{page}",
            params={"app_id": ADZUNA_ID, "app_key": ADZUNA_KEY,
                    "what": query, "results_per_page": 50,
                    "content-type": "application/json"},
            timeout=30)
        r.raise_for_status()
        results = r.json().get("results", [])
        if not results:
            break
        out.extend(results)
        page += 1
    return out[:max_results]


def embed_texts(texts):
    r = requests.post(f"{EMBED_URL}/api/embed",
                      json={"model": "nomic-embed-text", "input": texts},
                      timeout=120)
    r.raise_for_status()
    return r.json()["embeddings"]


def fetch_arbeitnow(query="", max_results=50):
    """Free, no key. Remote-tech board; query filters client-side."""
    r = requests.get("https://www.arbeitnow.com/api/job-board-api",
                     timeout=30)
    r.raise_for_status()
    jobs = r.json().get("data", [])
    if query:
        q = query.lower()
        jobs = [j for j in jobs
                if q in f"{j.get('title','')} {j.get('description','')}".lower()]
    return jobs[:max_results]


def _normalize(job, source, query):
    if source == "arbeitnow":
        return {"title": job.get("title", ""),
                "company": job.get("company_name", ""),
                "description": job.get("description", ""),
                "url": job.get("url", "")}
    return {"title": job.get("title", ""),
            "company": (job.get("company") or {}).get("display_name", ""),
            "description": job.get("description", ""),
            "url": job.get("redirect_url", "")}


def ingest_query(query, max_results=50, source="arbeitnow"):
    """Fetch + embed + store jobs for a query. Returns count stored.

    Embedding is best-effort: if Ollama (:11434) is down, listings are still
    stored (embedding=None) — the listing count/demand side of the score
    works without vectors. Re-running a query skips URLs already stored,
    so repeated ingests never duplicate rows."""
    from .models import JobListing
    if source == "arbeitnow":
        jobs = fetch_arbeitnow(query, max_results)
    else:
        jobs = fetch_jobs(query, max_results)
    seen_urls = set(JobListing.objects.filter(query=query).exclude(url="")
                    .values_list("url", flat=True))
    norm = [n for n in (_normalize(j, source, query) for j in jobs)
            if n["url"] not in seen_urls][:max_results]
    if not norm:
        return 0
    texts = [f"{n['title']} {n['description'][:500]}" for n in norm]
    try:
        vecs = embed_texts(texts)
    except Exception:
        vecs = [None] * len(norm)
    objs = [JobListing(title=n["title"][:300],
                       company=n["company"][:200],
                       description=n["description"][:2000],
                       url=n["url"][:500],
                       source=source, query=query, embedding=v)
            for n, v in zip(norm, vecs)]
    JobListing.objects.bulk_create(objs)
    return len(objs)
