import os, json, asyncio, requests
# SF serving (mlx_lm.server, OpenAI-compatible). Replaces the old Ollama
# "mada-sf-14b" path — the adapter now lives server-side, so `adapter` below
# is accepted-but-unused to keep every caller unchanged.
SF_URL = os.getenv("SF_URL", "http://localhost:8081")
SF_MODEL = "models/gemma4-12b-it-4bit"
async def call_sf14b(adapter, prompt, retries=2):
    import re
    body = {"model": SF_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2, "max_tokens": 800,
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
                # SF sometimes trails thought residue after a complete object —
                # extract the first complete {...} (same rule as training eval).
                start = text.find("{")
                depth = 0
                for i in range(start, len(text)):
                    if text[i] == "{": depth += 1
                    elif text[i] == "}":
                        depth -= 1
                        if depth == 0:
                            text = text[start:i + 1]
                            break
                json.loads(text)
            return text
        except Exception as e:
            if attempt==retries: raise
            await asyncio.sleep(0.3*(attempt+1))
