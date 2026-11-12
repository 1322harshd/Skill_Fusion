"""One-line-per-call log of every backend -> SF model request.

Written to backend/logs/model_calls.log (thread-safe appends; missing
directory is created lazily; a broken log must never break a model call):

    2026-11-12 18:22:31 | fusion         | OK     |    9.2s | attempt 1/3 · 204 chars
    2026-11-12 18:22:40 | resume         | FAILED |   85.3s | attempt 1/1 — ConnectionError: ...

`feature` identifies what the website asked for: fusion, fusion-score,
roadmap, roadmap-tweak, project, grading, quiz, post, evidence, explain,
resume, generate. Watch it live:

    tail -f backend/logs/model_calls.log
"""
import os
import threading
from datetime import datetime

_LOCK = threading.Lock()
_LOG_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs"
)
_LOG_PATH = os.path.join(_LOG_DIR, "model_calls.log")


def log_call(feature, ok, seconds, detail=""):
    """Append one summary line. Never raises (log failures are swallowed)."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status = "OK" if ok else "FAILED"
    line = f"{ts} | {feature:<14} | {status:<6} | {seconds:6.1f}s | {detail}".rstrip(" |")
    try:
        with _LOCK:
            os.makedirs(_LOG_DIR, exist_ok=True)
            with open(_LOG_PATH, "a", encoding="utf-8") as f:
                f.write(line + "\n")
    except OSError:
        pass


def trim_feature(adapter, feature):
    """Caller-supplied feature wins; otherwise derive from the adapter name
    (sf-roadmap-tweak -> roadmap-tweak, sf-fusion -> fusion)."""
    return feature or (adapter or "unknown").removeprefix("sf-")
