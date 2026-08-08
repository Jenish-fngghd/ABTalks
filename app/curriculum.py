"""Curriculum loading and the prerequisite graph.

The supplied curriculum.json has no explicit prerequisite edges -- only 8 modules
with ordered day ranges. So the graph is derived, not inferred by a model:
module N depends on module N-1, and days are ordered within a module. That is
weaker than a hand-authored concept graph but it is *true*, cheap, and enough to
answer the only question the planner asks of it: "what does this skipped day
block downstream?"

ponytail: derived edges, not LLM-extracted. If a future curriculum.json ships
real `prerequisites`, read them here and drop the derivation.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA = Path(__file__).resolve().parent.parent / "data"


@lru_cache(maxsize=1)
def curriculum() -> dict[str, Any]:
    return json.loads((DATA / "curriculum.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def days_by_num() -> dict[int, dict[str, Any]]:
    return {d["day"]: d for d in curriculum()["days"]}


@lru_cache(maxsize=1)
def module_of_day() -> dict[int, dict[str, Any]]:
    """day number -> its module record. `days` in the file is a [start, end] range."""
    out: dict[int, dict[str, Any]] = {}
    for mod in curriculum()["modules"]:
        start, end = mod["days"]
        for day in range(start, end + 1):
            out[day] = mod
    return out


def day(num: int) -> dict[str, Any]:
    return days_by_num()[num]


def module_num(num: int) -> int:
    return module_of_day()[num]["n"]


def all_days() -> list[int]:
    return sorted(days_by_num())


def downstream(num: int) -> list[int]:
    """Days that build on `num`, nearest first.

    Ordering is the whole graph: the cohort is a linear syllabus, so anything
    later assumes anything earlier. Nearest-first matters because the day right
    after a gap is where the gap actually shows.
    """
    return [d for d in all_days() if d > num]


def brief(num: int) -> str:
    """Compact one-day summary for the prompt. Keeps token cost predictable."""
    d = day(num)
    return (
        f"Day {d['day']} ({d['type']}) — {d['title']}\n"
        f"  Tools: {', '.join(d['tools'])}\n"
        f"  Objectives: " + "; ".join(d["objectives"])
    )
