import os, json, asyncio, requests
# SF serving (mlx_lm.server, OpenAI-compatible). Replaces the old Ollama
# "mada-sf-14b" path — the adapter now lives server-side, so `adapter` below
# is accepted-but-unused to keep every caller unchanged.
SF_URL = os.getenv("SF_URL", "http://localhost:8081")
SF_MODEL = "models/gemma4-12b-it-4bit"
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
async def call_sf14b(adapter, prompt, retries=2, max_tokens=800):
    import re
    body = {"model": SF_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1, "max_tokens": max_tokens,
            "stream": False, "enable_thinking": False}
    for attempt in range(retries+1):
        try:
            # sync requests in async wrapper for scaffold
            r=requests.post(f"{SF_URL}/v1/chat/completions", json=body, timeout=300)
            data=r.json()
            msg=data["choices"][0]["message"]
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
        except Exception as e:
            if attempt==retries: raise
            await asyncio.sleep(0.3*(attempt+1))

async def call_sf14b_json(adapter, prompt, retries=4, max_tokens=800):
    """Same as call_sf14b but returns the parsed object (lenient parse)."""
    text = await call_sf14b(adapter, prompt, retries=retries, max_tokens=max_tokens)
    obj, _ = parse_sf_json(text)
    return obj
