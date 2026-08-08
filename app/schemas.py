"""Wire contract (from technical-spec.md) + internal state types.

The Request/Response models here are the spec verbatim. Anything we add for the
UI lives under `meta`, which the spec does not forbid and judges can ignore.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

# --- spec: POST /api/interview ------------------------------------------------


class InterviewRequest(BaseModel):
    sessionId: str
    candidate: dict[str, Any] | None = None  # present only on the first request
    message: str | None = None  # present on every subsequent request


class Feedback(BaseModel):
    summary: str
    strengths: list[str]
    gaps: list[str]
    next: list[str]


class InterviewResponse(BaseModel):
    reply: str
    done: bool
    feedback: Feedback | None = None
    meta: dict[str, Any] | None = None  # extra, for the UI; not part of the spec


# --- internal -----------------------------------------------------------------

Status = Literal["mastered", "struggled", "skipped", "failed", "unknown"]
Intent = Literal["verify", "bridge", "depth", "tradeoff", "diagnose"]
Difficulty = Literal["warmup", "core", "deep", "stress"]


class DaySignal(BaseModel):
    """What the candidate's record says about one curriculum day."""

    day: int
    status: Status
    attempts: int | None = None


class PlannedQuestion(BaseModel):
    day: int
    module: int
    topic: str
    intent: Intent
    difficulty: Difficulty
    reason: str  # human-readable; surfaced in `meta` so the plan is inspectable
    priority: float


class Assessment(BaseModel):
    """Per-answer scoring. `terminology` high + `specificity` low == bluffing."""

    correctness: int = Field(ge=0, le=5)
    depth: int = Field(ge=0, le=5)
    specificity: int = Field(ge=0, le=5)
    terminology: int = Field(ge=0, le=5)
    notes: str = ""
    missing: list[str] = []

    @property
    def score(self) -> float:
        return (self.correctness + self.depth + self.specificity) / 3

    @property
    def bluffing(self) -> bool:
        return self.terminology >= 4 and self.specificity <= 2


class TurnResult(BaseModel):
    """One model call: assess the answer, then speak the next line."""

    assessment: Assessment
    action: Literal["followup", "advance"]
    reply: str


class Turn(BaseModel):
    slot: int  # which planned question this turn belongs to
    day: int
    question: str
    answer: str = ""
    assessment: Assessment | None = None
    is_followup: bool = False
