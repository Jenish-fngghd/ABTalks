"""Builds the interview plan before a single model call is made.

This is the part that guarantees the hard requirements. The spec wants >=8
questions across >=4 curriculum days; a prompt that *asks* for that will
sometimes not deliver it. A plan object always does, because the loop cannot
finish until every slot is consumed.

The model never chooses the topics. It only phrases them and scores answers.
"""

from __future__ import annotations

from app import curriculum as cur
from app.profile import Posture, day_signals, posture
from app.schemas import DaySignal, PlannedQuestion

MIN_QUESTIONS = 8
MIN_DAYS = 4
MIN_MODULES = 3
MAX_PER_DAY = 2

# Days worth interrogating even with a clean record -- these carry the cohort's
# actual engineering content rather than setup steps.
HIGH_VALUE_TYPES = {"AI_CORE", "SHIP_IT", "CAPSTONE", "OPTIMIZE"}

# status -> (base priority, interview intent, opening difficulty)
BY_STATUS: dict[str, tuple[float, str, str]] = {
    "failed": (100, "diagnose", "core"),
    "struggled": (90, "verify", "core"),
    "skipped": (80, "bridge", "core"),
    "mastered": (55, "depth", "deep"),
    "unknown": (30, "depth", "core"),
}


def _reason(sig: DaySignal, title: str) -> str:
    """Plain-English justification. Surfaced in the API `meta` and in the UI --
    the plan being inspectable is the point, so this text is user-facing."""
    if sig.status == "failed":
        return f"Recorded as not passed on Day {sig.day} ({title}). Diagnose where it broke down."
    if sig.status == "struggled":
        return (
            f"Passed Day {sig.day} ({title}) only after {sig.attempts} attempts. "
            "Check whether the difficulty was understood or worked around."
        )
    if sig.status == "skipped":
        return (
            f"Skipped Day {sig.day} ({title}). Asking about it directly only confirms "
            "they were not there, so probe it through a later day that assumes it."
        )
    if sig.status == "mastered":
        n = sig.attempts or 1
        return (
            f"Passed Day {sig.day} ({title}) in {n} attempt{'s' if n != 1 else ''}. "
            "Claimed strength -- push past recall into trade-offs."
        )
    return f"No record for Day {sig.day} ({title}). Establish baseline coverage."


def _priority(sig: DaySignal, post: Posture) -> float:
    base, _, _ = BY_STATUS[sig.status]
    d = cur.day(sig.day)
    score = base

    if d["type"] in HIGH_VALUE_TYPES:
        score += 12
    if d["type"] == "SETUP":
        score -= 25  # nobody's engineering judgement shows in "install VS Code"

    if sig.status == "struggled" and sig.attempts:
        score += min(sig.attempts, 6)

    # A grinder's clean passes are the least trustworthy data point they have,
    # so promote verification over breadth for them.
    if post.label == "persistent-grinder" and sig.status == "mastered":
        score += 15
    # Someone who aced everything first try earns harder, not easier, questions.
    if post.label == "fast-grasp" and sig.status == "mastered":
        score += 8

    return score


def _intent_and_difficulty(sig: DaySignal, post: Posture) -> tuple[str, str]:
    _, intent, difficulty = BY_STATUS[sig.status]
    if post.label == "fast-grasp" and sig.status == "mastered":
        return "tradeoff", "stress"
    if post.label == "persistent-grinder" and sig.status == "mastered":
        return "verify", "core"
    return intent, difficulty


def build_plan(candidate: dict, size: int = MIN_QUESTIONS) -> list[PlannedQuestion]:
    """Ordered interview plan. Guaranteed >= MIN_DAYS distinct days and
    >= MIN_MODULES distinct modules, or it raises rather than silently
    shipping a non-compliant interview."""
    post = posture(candidate)
    signals = day_signals(candidate)

    # Days with no record still deserve consideration -- coverage must not be
    # limited to the sample of missions we happen to have been given.
    for num in cur.all_days():
        signals.setdefault(num, DaySignal(day=num, status="unknown"))

    scored = sorted(
        signals.values(), key=lambda s: (-_priority(s, post), s.day)
    )

    plan: list[PlannedQuestion] = []
    per_day: dict[int, int] = {}
    modules: set[int] = set()

    def _bridge_target(gap: int) -> int | None:
        """Nearest later day the candidate actually has a record for.

        This is the one place the curriculum graph changes a decision rather than
        decorating an explanation: a skipped day is interrogated through the
        downstream day that depends on it, because that is where the gap surfaces
        as an answer they cannot complete.
        """
        for later in cur.downstream(gap):
            sig = signals.get(later)
            if sig and sig.status in ("mastered", "struggled"):
                return later
        return None

    def take(sig: DaySignal) -> None:
        intent, difficulty = _intent_and_difficulty(sig, post)
        ask_day, gap_day, gap_topic = sig.day, None, None

        if sig.status == "skipped":
            via = _bridge_target(sig.day)
            # Only redirect if the bridge day is not already carrying questions,
            # otherwise we would crowd one day and lose curriculum spread.
            if via is not None and per_day.get(via, 0) < MAX_PER_DAY:
                ask_day = via
                gap_day, gap_topic = sig.day, cur.day(sig.day)["title"]

        d = cur.day(ask_day)
        plan.append(
            PlannedQuestion(
                day=ask_day,
                module=cur.module_num(ask_day),
                topic=d["title"],
                intent=intent,  # type: ignore[arg-type]
                difficulty=difficulty,  # type: ignore[arg-type]
                reason=_reason(sig, cur.day(sig.day)["title"]),
                priority=_priority(sig, post),
                gap_day=gap_day,
                gap_topic=gap_topic,
            )
        )
        per_day[ask_day] = per_day.get(ask_day, 0) + 1
        modules.add(cur.module_num(ask_day))

    # Pass 1: spread. One question per day, one day per module, highest priority
    # first. This front-loads the diversity requirement so it cannot be missed.
    for sig in scored:
        if len(plan) >= size:
            break
        if per_day.get(sig.day):
            continue
        if cur.module_num(sig.day) in modules and len(modules) < MIN_MODULES:
            continue
        take(sig)

    # Pass 2: fill remaining slots by priority, up to MAX_PER_DAY per day.
    for sig in scored:
        if len(plan) >= size:
            break
        if per_day.get(sig.day, 0) >= MAX_PER_DAY:
            continue
        take(sig)

    distinct_days = len({p.day for p in plan})
    if len(plan) < size or distinct_days < MIN_DAYS or len(modules) < MIN_MODULES:
        raise ValueError(
            f"plan failed coverage floor: {len(plan)} questions, "
            f"{distinct_days} days, {len(modules)} modules"
        )

    # Interview in curriculum order -- jumping around the syllabus reads as random.
    plan.sort(key=lambda p: (p.day, -p.priority))
    return plan
