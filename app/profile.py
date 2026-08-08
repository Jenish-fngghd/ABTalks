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
    m = candidate.get("member", {})
    s = candidate.get("signals", {})
    return Posture(
        name=m.get("name", "Candidate"),
        role=m.get("jobRole", "Engineer"),
        years=int(m.get("yearsExperience", 0) or 0),
        completed=int(s.get("missionsCompleted", 0) or 0),
        first_try=int(s.get("missionsFirstTry", 0) or 0),
        commit_days=int(s.get("commitDays", 0) or 0),
    )


def day_signals(candidate: dict[str, Any]) -> dict[int, DaySignal]:
    """Map each day the record mentions to a status.

    Note: the mission list is a *sample*. CAND-001 lists 10 missions but reports
    30 completed, so days absent from the list are "unknown", never "skipped".
    The interviewer must not accuse someone of skipping a day it has no record of.
    """
    out: dict[int, DaySignal] = {}
    for mission in candidate.get("missions", []):
        num = mission.get("day")
        if num is None:
            continue
        attempts = mission.get("attempts")
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
