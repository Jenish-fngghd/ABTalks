"""Session storage.

ponytail: a plain dict behind a lock. Interviews are single-process, short-lived,
and the problem statement explicitly puts persistent accounts and long-term
history out of scope. What breaks: a redeploy or crash drops in-flight sessions,
and a second worker process would not see them -- so the app runs with one worker.
Swap in Redis here (same three methods) if either ever matters.
"""

from __future__ import annotations

import threading
import time

from app.interviewer import Session

MAX_SESSIONS = 500
MAX_AGE_SECONDS = 2 * 60 * 60

_lock = threading.Lock()
_sessions: dict[str, tuple[float, Session]] = {}


def _evict_locked() -> None:
    now = time.time()
    stale = [k for k, (ts, _) in _sessions.items() if now - ts > MAX_AGE_SECONDS]
    for k in stale:
        del _sessions[k]
    while len(_sessions) > MAX_SESSIONS:
        oldest = min(_sessions, key=lambda k: _sessions[k][0])
        del _sessions[oldest]


def put(session: Session) -> None:
    with _lock:
        _sessions[session.id] = (time.time(), session)
        _evict_locked()


def get(session_id: str) -> Session | None:
    with _lock:
        entry = _sessions.get(session_id)
        return entry[1] if entry else None


def count() -> int:
    with _lock:
        return len(_sessions)
