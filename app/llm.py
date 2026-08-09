"""LLM access. Any OpenAI-compatible endpoint works -- set LLM_BASE_URL.

Provider-agnostic on purpose: the sponsor endpoint, Groq, OpenRouter, a local
Ollama, or OpenAI itself all speak this shape. Switching providers is an env
change, not a code change, which also matters for the Live Steer round.

If no API key is configured the module falls back to a scripted stand-in so the
eval suite and the UI still run offline. That stand-in is a test double, not a
model -- it never ships as the demo path.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)

BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
API_KEY = os.getenv("LLM_API_KEY", "")
MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
TIMEOUT = float(os.getenv("LLM_TIMEOUT", "45"))

OFFLINE = not API_KEY

_client: Any = None


def _client_once() -> Any:
    global _client
    if _client is None:
        from openai import OpenAI

        # max_retries=0: the SDK's own built-in retry (2 attempts, 15-30s backoff
        # apiece) was intercepting 429s before our own rotate-to-a-spare-key logic
        # ever saw them -- a rate limit sat there retrying the SAME exhausted key
        # for up to a minute instead of failing straight into the next key.
        _client = OpenAI(base_url=BASE_URL, api_key=API_KEY, timeout=TIMEOUT, max_retries=0)
    return _client


# Extra Groq keys from separate organizations -- unlike same-org keys (see the
# comment on FALLBACK_* below), these have independent daily quotas, so rotating
# to one on a rate limit actually buys headroom instead of hitting the same cap.
_EXTRA_GROQ_KEYS = [
    k for k in (os.getenv("GROQ_API_KEY_2", ""), os.getenv("GROQ_API_KEY_3", "")) if k
]
_extra_groq_clients: list[Any] = []


def _extra_groq() -> list[Any]:
    """Lazily built clients for the extra Groq keys, same base URL and model."""
    global _extra_groq_clients
    if not _extra_groq_clients and _EXTRA_GROQ_KEYS:
        from openai import OpenAI

        _extra_groq_clients = [
            OpenAI(base_url=BASE_URL, api_key=k, timeout=TIMEOUT, max_retries=0)
            for k in _EXTRA_GROQ_KEYS
        ]
    return _extra_groq_clients


def _extract_json(text: str) -> str:
    """Models wrap JSON in prose or fences more often than they admit."""
    fenced = re.search(r"```(?:json)?\s*(.+?)```", text, re.S)
    if fenced:
        return fenced.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    return text[start : end + 1] if start != -1 and end > start else text


# Fallback provider, used when the primary rate-limits.
#
# Measured, not guessed: Groq's free tier caps tokens per day per *organization*,
# not per key -- three keys from one org share one 200k allowance, so rotating
# keys buys nothing. Falling back to a different provider does. Without this a
# live demo dies mid-interview once the day's allowance is gone.
FALLBACK_BASE_URL = os.getenv("FALLBACK_BASE_URL", "")
FALLBACK_API_KEY = os.getenv("FALLBACK_API_KEY", "")
FALLBACK_MODEL = os.getenv("FALLBACK_MODEL", "")

_fallback_client: Any = None


def _fallback() -> tuple[Any, str] | None:
    global _fallback_client
    if not (FALLBACK_BASE_URL and FALLBACK_API_KEY and FALLBACK_MODEL):
        return None
    if _fallback_client is None:
        from openai import OpenAI

        _fallback_client = OpenAI(
            base_url=FALLBACK_BASE_URL, api_key=FALLBACK_API_KEY, timeout=TIMEOUT, max_retries=0
        )
    return _fallback_client, FALLBACK_MODEL


def structured_ex(
    system: str,
    user: str,
    model_cls: type[T],
    *,
    temperature: float = 0.6,
    client: Any = None,
    model: str | None = None,
) -> tuple[T, int]:
    """One call, validated into `model_cls`. Returns (result, attempts_used).

    Retries once with the schema attached when output does not validate, and
    rotates to a spare API key on a rate limit.

    ponytail: json_object mode + parse + one retry, rather than provider-specific
    json_schema. Open-weight endpoints support the former far more consistently.
    """
    if OFFLINE and client is None:
        return _offline(user, model_cls), 1

    # Everything here is transient and observed in practice: daily token caps,
    # dropped connections to a NIM endpoint, and slow cold starts. None of them
    # should end an interview that is halfway through.
    from openai import APIConnectionError, APITimeoutError, InternalServerError, RateLimitError

    transient = (RateLimitError, APIConnectionError, APITimeoutError, InternalServerError)

    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    active, active_model = client or _client_once(), model or MODEL
    # Rotation order: extra Groq keys (separate orgs, independent quotas) first,
    # then the cross-provider fallback last -- a same-family retry is more likely
    # to behave identically to the primary than switching providers outright.
    spares = (
        [(c, active_model) for c in _extra_groq()] + ([_fallback()] if _fallback() else [])
        if client is None
        else []
    )
    last: Exception | None = None
    # 3 attempts to get valid JSON, plus one shot per spare key/provider on top --
    # a rate limit rotating through 3 keys should not eat into the JSON-retry
    # budget the primary key gets.
    max_attempts = 3 + len(spares)

    for attempt in range(1, max_attempts + 1):
        try:
            resp = active.chat.completions.create(
                model=active_model,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
            )
        except transient as exc:
            last = exc
            if not spares:
                raise
            active, active_model = spares.pop(0)
            continue

        raw = resp.choices[0].message.content or ""
        # Observed live on the small open-weight model: an occasional garbled
        # multi-byte character comes back as U+FFFD baked into otherwise-valid
        # JSON -- a candidate reading "let�s move on" instead of "let's move
        # on" in their question. Treated the same as a schema-validation miss:
        # ask the model to resend cleanly rather than serving the replacement
        # character to the transcript.
        if "�" in raw:
            last = ValueError("reply contained a corrupted (U+FFFD) character")
            messages.append({"role": "assistant", "content": raw})
            messages.append(
                {
                    "role": "user",
                    "content": (
                        "Your reply contained a garbled character. Resend the same "
                        "JSON with clean text -- plain ASCII punctuation only, no "
                        "special quote or dash characters."
                    ),
                }
            )
            continue
        try:
            return model_cls.model_validate_json(_extract_json(raw)), attempt
        except (ValidationError, ValueError) as exc:
            last = exc
            messages.append({"role": "assistant", "content": raw})
            messages.append(
                {
                    "role": "user",
                    "content": (
                        f"That did not validate: {exc}. Reply with JSON matching this "
                        f"schema and nothing else:\n{json.dumps(model_cls.model_json_schema())}"
                    ),
                }
            )
    raise RuntimeError(f"model returned unusable JSON after retries: {last}")


def structured(
    system: str, user: str, model_cls: type[T], *, temperature: float = 0.6
) -> T:
    return structured_ex(system, user, model_cls, temperature=temperature)[0]


# --- offline test double ------------------------------------------------------
# Scores on answer length and concrete-detail density. Crude, but it separates
# the eval personas (strong / weak / bluffer / silent), which is all it is for.

_CONCRETE = re.compile(r"\d|because|trade-?off|latency|instead|we (chose|used|hit)", re.I)
_JARGON = re.compile(
    r"embedding|vector|chunk|retriev|agent|orchestrat|token|index|prompt|pipeline|scal", re.I
)


def _offline(user: str, model_cls: type[T]) -> T:
    from app.interviewer import Opening
    from app.schemas import Assessment, Feedback, TurnResult

    if model_cls is Opening:
        target = re.search(r"Day (\d+), ([^\n]+)", user)
        topic = target.group(2).strip() if target else "your cohort work"
        return model_cls(  # type: ignore[return-value]
            reply=f"[offline mode] Let's start with {topic}. Walk me through what you built."
        )

    answer = user.rsplit("<candidate_answer>", 1)[-1].split("</candidate_answer>")[0]
    words = len(answer.split())
    concrete = len(_CONCRETE.findall(answer))
    jargon = len(_JARGON.findall(answer))

    if model_cls is TurnResult:
        # The stand-in must classify intent too, or the eval's clarify/concede
        # personas silently exercise the plain-answer path and prove nothing.
        low = answer.lower()
        if "?" in answer and len(answer.split()) < 30:
            intent = "clarify"
        elif re.search(r"do not (know|remember)|don't (know|remember)|no idea", low):
            intent = "concede"
        else:
            intent = "answer"
        a = Assessment(
            correctness=min(5, jargon),
            depth=min(5, words // 25),
            specificity=min(5, concrete),
            terminology=min(5, jargon),
            # Crude proxy: very short or very long answers communicate worst.
            communication=1 if words < 8 or words > 120 else 3,
            notes="offline scorer: no model configured",
            missing=["set LLM_API_KEY for real scoring"],
        )
        return model_cls(  # type: ignore[return-value]
            intent=intent,
            assessment=a,
            action="advance" if intent == "concede" or not (a.bluffing or a.score < 2) else "followup",
            reply="[offline mode] Walk me through a concrete example from your build.",
        )
    if model_cls is Feedback:
        # Cite the days actually covered. The stand-in has to be structurally
        # representative or the eval's "feedback references real curriculum days"
        # assertion tests the stub instead of the product.
        days = sorted({int(d) for d in re.findall(r"^Day (\d+) \(", user, re.M)})[:4]
        return model_cls(  # type: ignore[return-value]
            summary="[offline mode] No model configured; scores are heuristic.",
            strengths=["Completed the interview"],
            gaps=[f"Day {d}: not assessed, no model configured" for d in days]
            or ["Real evaluation requires LLM_API_KEY"],
            next=[f"Day {d}: re-run with a provider configured" for d in days]
            or ["Configure a provider in .env"],
        )
    raise RuntimeError(f"no offline stand-in for {model_cls.__name__}")
