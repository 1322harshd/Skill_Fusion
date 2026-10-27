import os, json, asyncio, requests
from django.conf import settings
# SF serving (mlx_lm.server, OpenAI-compatible). Replaces the old Ollama
# "mada-sf-14b" path — the adapter now lives server-side, so `adapter` below
# is accepted-but-unused to keep every caller unchanged.
#
# Reads via django.conf.settings, not os.getenv: this project loads .env
# through python-decouple, which keeps values in its own store and never
# exports them into the real OS environment — os.getenv("LLM_API_URL") would
# always miss .env and silently fall back to localhost.
SF_URL = getattr(settings, "LLM_API_URL", None) or os.getenv("SF_URL", "http://localhost:8081")
SF_MODEL = getattr(settings, "LLM_MODEL", None) or "models/gemma4-12b-it-4bit"
def parse_sf_json(text):
    """Lenient SF-JSON parse: strict, then first-object extraction, then
    control-character-tolerant. Raises JSONDecodeError only if all fail."""
    import re
    t = text.strip().replace("```json", "").replace("```", "").strip()
    t = re.sub(r",\s*([}\]])", r"\1", t)
    try:
        return json.loads(t), t
    except json.JSONDecodeError:
        pass
    start = t.find("{")
    depth = 0
    for i in range(max(start, 0), len(t)):
        if t[i] == "{": depth += 1
        elif t[i] == "}":
            depth -= 1
            if depth == 0:
                t = t[start:i + 1]
                break
    try:
        return json.loads(t), t
    except json.JSONDecodeError:
        return json.loads(t, strict=False), t
async def call_sf14b(adapter, prompt, retries=2, max_tokens=3000):
    import re
    body = {"model": SF_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1, "max_tokens": max_tokens,
            "stream": False,
            # Disable gemma4's hidden reasoning pass. NOTE: this must be
            # nested under chat_template_kwargs — a top-level enable_thinking
            # key is silently ignored by mlx_lm.server, and the generation task
            # family then spirals to 12-20k reasoning tokens and dies at the
            # cap (the "re-thinking forever" failure). Measured: identical
            # roadmap prompt with the kwarg off = 20k tokens/no output; with
            # it on = ~9s, zero reasoning tokens, clean JSON.
            "chat_template_kwargs": {"enable_thinking": False}}
    for attempt in range(retries+1):
        try:
            # sync requests in async wrapper for scaffold
            r=requests.post(f"{SF_URL}/v1/chat/completions", json=body, timeout=300)
            data=r.json()
            choice=data["choices"][0]
            msg=choice["message"]
            # Even with thinking disabled the model can occasionally emit a
            # scratchpad (the template toggle is best-effort server-side); a
            # length cutoff reads as a JSONDecodeError below instead of what
            # it is, so surface it clearly.
            if choice.get("finish_reason") == "length":
                raise ValueError(f"SF response cut off before completing (max_tokens={max_tokens} too low)")
            text=((msg.get("content") or "") + (msg.get("reasoning") or "")).strip().replace("```json","").replace("```","").strip()
            # repair trailing commas
            text=re.sub(r",\s*([}\]])", r"\1", text)
            try:
                json.loads(text)
            except json.JSONDecodeError:
                # SF emits thought-trace alongside JSON (content and reasoning
                # channels both carry text) — extract the first complete {...}.
                # (Same rule the SF training eval uses.)
                start = text.find("{")
                depth = 0
                for i in range(start, len(text)):
                    if text[i] == "{": depth += 1
                    elif text[i] == "}":
                        depth -= 1
                        if depth == 0:
                            text = text[start:i + 1]
                            break
                try:
                    json.loads(text)
                except json.JSONDecodeError:
                    # literal control characters inside strings (model-emitted
                    # raw newlines) — allow them rather than failing.
                    json.loads(text, strict=False)
            return text
        except Exception:
            if attempt==retries: raise
            await asyncio.sleep(0.3*(attempt+1))

async def call_sf14b_json(adapter, prompt, retries=4, max_tokens=3000):
    """Same as call_sf14b but returns the parsed object (lenient parse)."""
    text = await call_sf14b(adapter, prompt, retries=retries, max_tokens=max_tokens)
    obj, _ = parse_sf_json(text)
    return obj
