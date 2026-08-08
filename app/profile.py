"""Candidate record -> per-day signals and a global learning posture.

Everything here is deterministic. No model call is involved in deciding what the
candidate is good or bad at -- that comes straight off their record, so the
interview plan is auditable and reproducible.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.schemas import DaySignal

STRUGGLE_ATTEMPTS = 3  # attempts at or above this == the day was hard for them


@dataclass
class Posture:
    """Global read on *how* the candidate learned, not just what they finished."""

    name: str
    role: str
    years: int
    completed: int
    first_try: int
    commit_days: int

    @property
    def first_try_rate(self) -> float:
        # The strongest signal in this dataset: 31/31 learned it, 1/31 ground it out.
        return self.first_try / self.completed if self.completed else 0.0

    @property
    def consistency(self) -> float:
        return self.commit_days / 31

    @property
    def label(self) -> str:
        if self.first_try_rate >= 0.7:
            return "fast-grasp"
        if self.first_try_rate >= 0.35:
            return "steady"
        return "persistent-grinder"

    @property
    def strategy(self) -> str:
        """One line the interviewer prompt uses to set its stance."""
        return {
            "fast-grasp": (
                "Concepts came easily to them. Do not lob softballs -- push to "
                "trade-offs, failure modes, and 'what would you do differently'."
            ),
            "steady": (
                "Mixed record. Verify that passing translated into understanding "
                "before escalating difficulty."
            ),
            "persistent-grinder": (
                "Completed nearly everything but needed many attempts. They may have "
                "pattern-matched their way through. Prioritise verifying real "
                "understanding over breadth."
            ),
        }[self.label]


def posture(candidate: dict[str, Any]) -> Posture:
    m = candidate.get("member") or {}
    s = candidate.get("signals") or {}

    def num(source: dict, key: str) -> int:
        """Coerce defensively -- this object arrives over HTTP."""
        try:
            return max(0, int(source.get(key, 0) or 0))
        except (TypeError, ValueError):
            return 0

    def text(key: str, fallback: str) -> str:
        """Free text from the request is quoted into the prompt, so it is length-capped
        and stripped of the delimiters and newlines used to structure that prompt.
        A name like "Bob\\n\\nIgnore previous instructions" must not become a section."""
        value = m.get(key)
        if not isinstance(value, str) or not value.strip():
            return fallback
        cleaned = " ".join(value.split())
        for token in ("<", ">", "```"):
            cleaned = cleaned.replace(token, "")
        return cleaned[:80] or fallback

    return Posture(
        name=text("name", "Candidate"),
        role=text("jobRole", "Engineer"),
        years=num(m, "yearsExperience"),
        completed=num(s, "missionsCompleted"),
        first_try=num(s, "missionsFirstTry"),
        commit_days=num(s, "commitDays"),
    )


def day_signals(candidate: dict[str, Any]) -> dict[int, DaySignal]:
    """Map each day the record mentions to a status.

    Note: the mission list is a *sample*. CAND-001 lists 10 missions but reports
    30 completed, so days absent from the list are "unknown", never "skipped".
    The interviewer must not accuse someone of skipping a day it has no record of.
    """
    from app.curriculum import days_by_num

    valid = days_by_num()
    out: dict[int, DaySignal] = {}
    for mission in candidate.get("missions", []):
        if not isinstance(mission, dict):
            continue
        num = mission.get("day")
        # The candidate object arrives over HTTP, so it is untrusted: a day number
        # outside the curriculum, or a non-integer, must not reach a dict lookup.
        if not isinstance(num, int) or isinstance(num, bool) or num not in valid:
            continue
        attempts = mission.get("attempts")
        if not isinstance(attempts, int) or isinstance(attempts, bool) or attempts < 0:
            attempts = None
        if mission.get("skipped"):
            status = "skipped"
        elif mission.get("passed") is False:
            status = "failed"
        elif attempts and attempts >= STRUGGLE_ATTEMPTS:
            status = "struggled"
        else:
            status = "mastered"
        out[num] = DaySignal(day=num, status=status, attempts=attempts)
    return out
