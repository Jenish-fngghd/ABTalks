"""Wire contract (from technical-spec.md) + internal state types.

The Request/Response models here are the spec verbatim. Anything we add for the
UI lives under `meta`, which the spec does not forbid and judges can ignore.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

# --- spec: POST /api/interview ------------------------------------------------


class InterviewRequest(BaseModel):
    # Bounded because it is a store key supplied by the client: an empty string is
    # not a session, and a megabyte of it should not become one.
    sessionId: str = Field(min_length=1, max_length=200)
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
    # Set when this question probes a *skipped* day indirectly, by asking about a
    # later day that depends on it. You cannot ask someone to explain a day they
    # never did; you can ask about the day that assumes it and watch the seam.
    gap_day: int | None = None
    gap_topic: str | None = None
    # True when the candidate's record says nothing about this day. The question
    # must then be asked tentatively -- the mission list is a sample, so silence
    # means "unknown", never "skipped".
    unrecorded: bool = False


class Assessment(BaseModel):
    """Per-answer scoring, on two groups of axes.

    Knowledge -- correctness, depth, specificity -- is what they understand.
    `terminology` is tracked apart from those because vocabulary without substance
    is bluffing rather than knowledge.

    `communication` is the fifth axis and belongs to neither group. The brief's own
    framing is that graduates "should be able to confidently explain the systems
    they built" and that "effectively communicating this knowledge remains one of
    the biggest challenges" -- so an interviewer that only scores what a candidate
    knows measures the wrong half of the stated problem. Someone can understand
    retrieval perfectly and still lose an interview by rambling.
    """

    # Filled before any score. Forcing the technical claims to be written out first
    # stops delivery from bleeding into the knowledge scores: a model that has just
    # listed "800-token chunks, 120 overlap, section bleed" cannot then rate
    # specificity 1 because the sentence around those facts was a mess. Measured --
    # without this field a rambling answer scored identically to a factually wrong
    # one, which is precisely the distinction this product exists to make.
    claims: list[str] = []
    correctness: int = Field(ge=0, le=5)
    depth: int = Field(ge=0, le=5)
    specificity: int = Field(ge=0, le=5)
    terminology: int = Field(ge=0, le=5)
    communication: int = Field(default=3, ge=0, le=5)
    notes: str = ""
    missing: list[str] = []

    @property
    def score(self) -> float:
        """Knowledge score. Communication is reported separately and never
        inflates or masks what the candidate actually knows."""
        return (self.correctness + self.depth + self.specificity) / 3

    @property
    def undersells(self) -> bool:
        """Knows it, explains it badly -- the exact person this product is for."""
        return self.score >= 3 and self.communication <= 2

    @property
    def bluffing(self) -> bool:
        """Vocabulary outran substance.

        Defined as a *gap* rather than an absolute terminology score. Models
        differ in how generously they rate terminology -- some scored a plainly
        jargon-heavy answer 2/5 -- so requiring terminology >= 4 made detection
        depend on the model's calibration instead of on the answer.
        """
        return self.terminology - self.specificity >= 2 and self.specificity <= 2


class TurnResult(BaseModel):
    """One model call: read what the candidate did, assess it, then speak.

    `intent` exists because not every message is an attempted answer. A real
    interviewer answers a clarifying question instead of repeating themselves, and
    moves on when someone honestly concedes rather than asking the same thing
    again in different words.
    """

    intent: Literal["answer", "clarify", "concede"] = "answer"
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
