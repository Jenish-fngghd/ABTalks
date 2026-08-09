"""Session storage.

Two backends behind the same four functions (put/get/count, plus the lock pair
acquire_lock/release_lock). Which one runs is decided once, at import time, by
whether Upstash's env vars are present:

- No UPSTASH_REDIS_REST_URL: an in-memory dict behind a threading.Lock.
  Correct for a single long-running process (Render, local dev) -- the
  Dockerfile runs exactly one worker for this reason. A redeploy or crash
  drops in-flight sessions, and a second worker would not see them.
- UPSTASH_REDIS_REST_URL set: Upstash's REST client. Serverless platforms
  (Vercel) run each request on a possibly-different, possibly-concurrent
  instance with no shared memory, so state has to live somewhere all
  instances can reach. REST rather than a TCP redis:// client because
  serverless functions are short-lived -- no connection to pool or leak.

The lock changed meaning to match: it used to be an attribute on the Session
object (threading.Lock only means anything within one process). Now it's
keyed by session id and owned by the store, because that's the only thing
guaranteed to be the same across instances.
"""

from __future__ import annotations

import os
import threading
import time

from app.interviewer import Session

MAX_SESSIONS = 500
MAX_AGE_SECONDS = 2 * 60 * 60
LOCK_TTL_SECONDS = 60  # well past how long one turn ever takes; guards a crashed holder

_REDIS_URL = os.getenv("UPSTASH_REDIS_REST_URL")
_REDIS_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")


class _MemoryStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._sessions: dict[str, tuple[float, Session]] = {}
        self._turn_locks: dict[str, threading.Lock] = {}

    def _evict_locked(self) -> None:
        now = time.time()
        stale = [k for k, (ts, _) in self._sessions.items() if now - ts > MAX_AGE_SECONDS]
        for k in stale:
            del self._sessions[k]
            self._turn_locks.pop(k, None)
        while len(self._sessions) > MAX_SESSIONS:
            oldest = min(self._sessions, key=lambda k: self._sessions[k][0])
            del self._sessions[oldest]
            self._turn_locks.pop(oldest, None)

    def put(self, session: Session) -> None:
        with self._lock:
            self._sessions[session.id] = (time.time(), session)
            self._evict_locked()

    def get(self, session_id: str) -> Session | None:
        with self._lock:
            entry = self._sessions.get(session_id)
            return entry[1] if entry else None

    def count(self) -> int:
        with self._lock:
            return len(self._sessions)

    def list_completed(self, limit: int) -> list[Session]:
        with self._lock:
            done = [s for _, s in self._sessions.values() if s.done]
        done.sort(key=lambda s: s.completed_at or 0, reverse=True)
        return done[:limit]

    def acquire_lock(self, session_id: str) -> bool:
        with self._lock:
            turn_lock = self._turn_locks.setdefault(session_id, threading.Lock())
        return turn_lock.acquire(blocking=False)

    def release_lock(self, session_id: str) -> None:
        with self._lock:
            turn_lock = self._turn_locks.get(session_id)
        if turn_lock is not None and turn_lock.locked():
            turn_lock.release()


class _RedisStore:
    """Upstash REST backend. Same contract as _MemoryStore, no local state."""

    def __init__(self, url: str, token: str) -> None:
        from upstash_redis import Redis  # deferred: only needed on this path

        self._r = Redis(url=url, token=token)

    @staticmethod
    def _key(session_id: str) -> str:
        return f"session:{session_id}"

    @staticmethod
    def _lock_key(session_id: str) -> str:
        return f"lock:{session_id}"

    def put(self, session: Session) -> None:
        import json

        self._r.set(self._key(session.id), json.dumps(session.to_dict()), ex=MAX_AGE_SECONDS)

    def get(self, session_id: str) -> Session | None:
        import json

        raw = self._r.get(self._key(session_id))
        if raw is None:
            return None
        return Session.from_dict(json.loads(raw))

    def count(self) -> int:
        # DBSIZE counts every key in the logical database, including lock keys --
        # informational only (surfaced on /health), never used for eviction, so
        # the small overcount is not worth a second round trip to correct.
        try:
            return int(self._r.dbsize())
        except Exception:
            return -1

    def list_completed(self, limit: int) -> list[Session]:
        import json

        # KEYS is O(n) on the whole keyspace, which is a real problem at production
        # scale -- fine here: MAX_SESSIONS caps this at 500, and this endpoint backs
        # a hackathon demo's homepage list, not a high-traffic path. SCAN would be
        # the correct choice past that point.
        keys = self._r.keys(self._key("*"))
        if not keys:
            return []
        raw_values = self._r.mget(*keys)
        sessions = []
        for raw in raw_values:
            if raw is None:
                continue
            s = Session.from_dict(json.loads(raw))
            if s.done:
                sessions.append(s)
        sessions.sort(key=lambda s: s.completed_at or 0, reverse=True)
        return sessions[:limit]

    def acquire_lock(self, session_id: str) -> bool:
        # SET ... NX EX: succeeds only if the key does not already exist. That
        # atomicity is what makes this safe across concurrent instances --
        # "check then set" from two callers would race, a single NX command can't.
        ok = self._r.set(self._lock_key(session_id), "1", nx=True, ex=LOCK_TTL_SECONDS)
        return bool(ok)

    def release_lock(self, session_id: str) -> None:
        self._r.delete(self._lock_key(session_id))


_store = (
    _RedisStore(_REDIS_URL, _REDIS_TOKEN) if _REDIS_URL and _REDIS_TOKEN else _MemoryStore()
)


def put(session: Session) -> None:
    _store.put(session)


def get(session_id: str) -> Session | None:
    return _store.get(session_id)


def count() -> int:
    return _store.count()


def list_completed(limit: int = 20) -> list[Session]:
    """Most recently completed interviews, newest first."""
    return _store.list_completed(limit)


def acquire_lock(session_id: str) -> bool:
    """Non-blocking: a second in-flight request on the same session is a
    duplicate submit, not a queued turn -- refuse it rather than wait."""
    return _store.acquire_lock(session_id)


def release_lock(session_id: str) -> None:
    _store.release_lock(session_id)
