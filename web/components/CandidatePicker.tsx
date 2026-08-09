"use client";

import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useMemo, useState, type MouseEvent } from "react";
import { FilterChips } from "@/components/FilterChips";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Candidate, ReportSummary } from "@/lib/api";

type PostureFilter = "all" | "fast-grasp" | "steady" | "persistent-grinder";

const POSTURE_FILTERS: { value: PostureFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fast-grasp", label: "Fast grasp" },
  { value: "steady", label: "Steady" },
  { value: "persistent-grinder", label: "Persistent grinder" },
];

/** Same rule as the backend's Posture: how they learned, not just what they finished. */
function posture(c: Candidate) {
  const rate = c.signals.missionsCompleted
    ? c.signals.missionsFirstTry / c.signals.missionsCompleted
    : 0;
  if (rate >= 0.7) return { key: "fast-grasp" as const, label: "Fast grasp", color: "var(--good)", rate };
  if (rate >= 0.35) return { key: "steady" as const, label: "Steady", color: "var(--warn)", rate };
  return { key: "persistent-grinder" as const, label: "Persistent grinder", color: "var(--bad)", rate };
}

export function CandidatePicker({
  candidates,
  reports,
  onPick,
  onOpenReport,
  busy,
}: {
  candidates: Candidate[];
  reports: ReportSummary[];
  onPick: (c: Candidate) => void;
  onOpenReport: (r: ReportSummary) => void;
  busy: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PostureFilter>("all");
  const [searchFocused, setSearchFocused] = useState(false);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) => c.member.name.toLowerCase().includes(q) || c.member.jobRole.toLowerCase().includes(q),
    );
  }, [candidates, query]);

  // Counts reflect the search but not the posture filter itself -- otherwise
  // picking "Fast grasp" would zero out every other chip's count, which reads as
  // "no other candidates exist" rather than "not currently shown".
  const counts = useMemo(() => {
    const c: Record<PostureFilter, number> = {
      all: searched.length,
      "fast-grasp": 0,
      steady: 0,
      "persistent-grinder": 0,
    };
    for (const cand of searched) c[posture(cand).key]++;
    return c;
  }, [searched]);

  const filtered = useMemo(
    () => (filter === "all" ? searched : searched.filter((c) => posture(c).key === filter)),
    [searched, filter],
  );

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-2"
      >
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          AI Interview Agent
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
          Pick a candidate. The agent reads their 31-day cohort record, builds an interview plan
          from what they struggled with, skipped, or passed too easily, and adapts as they answer.
        </p>
        <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-faint">
          Good answers lead with what you actually built — numbers, trade-offs, what broke —
          over correct-sounding vocabulary.
        </p>
      </motion.div>

      {reports.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-9"
        >
          <h2 className="mono mb-3 text-[11px] uppercase tracking-[0.16em] text-faint">
            Recent reports
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {reports.map((r) => (
              <motion.button
                key={r.sessionId}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpenReport(r)}
                className="flex shrink-0 items-center gap-2.5 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <span
                  className="mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  {overallScore(r).toFixed(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{r.name}</p>
                  <p className="mono truncate text-[10px] text-faint">
                    {r.meta.questionsAsked} questions · {r.meta.daysCovered.length} days
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <motion.div
          className="relative flex-1"
          animate={{ scale: searchFocused ? 1.01 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <motion.svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
            animate={query ? { scale: 1.1, color: "var(--accent)" } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </motion.svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by name or role…"
            aria-label="Search candidates"
            className="w-full rounded-full border border-line bg-panel py-2.5 pl-10 pr-9 text-[14px] text-text placeholder:text-faint focus:border-accent/50 focus:outline-none"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className="absolute right-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full text-faint hover:text-text"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
        <FilterChips
          label="Filter by posture"
          filters={POSTURE_FILTERS.map((f) => ({ id: f.value, label: f.label }))}
          active={filter}
          counts={counts}
          onChange={setFilter}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.p
          key={filtered.length}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="mono mt-4 text-[11px] text-faint"
        >
          {filtered.length} of {candidates.length} candidates
        </motion.p>
      </AnimatePresence>

      {candidates.length === 0 && (
        <p className="mt-10 rounded-xl border border-line bg-panel px-4 py-3 text-[13px] text-muted">
          No candidate records loaded. The API reached <code className="mono">/api/candidates</code>{" "}
          but it came back empty — check that <code className="mono">data/candidates.json</code> is
          present on the backend.
        </p>
      )}

      {candidates.length > 0 && filtered.length === 0 && (
        <p className="mt-10 rounded-xl border border-line bg-panel px-4 py-3 text-[13px] text-muted">
          No candidates match "{query}".
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((c, i) => (
            <CandidateCard key={c.member.id} candidate={c} index={i} busy={busy} onPick={onPick} />
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}

// Pointer-tracked tilt + glare, adapted from React Bits' ProfileCard
// (registry @react-bits, MIT, via the shadcn MCP) -- that component is a
// single hero card (holographic avatar layer, fixed 540px height, a
// requestAnimationFrame tilt engine with inertia) built for one photo, not a
// dense 20-card grid. What's reused here is only the pointer-percent math
// (rotateX/Y and a glare radial-gradient positioned at the pointer) driven by
// a Framer Motion spring instead of a RAF loop, since a single settle spring
// per card is cheap enough for a full grid where 20 parallel RAF engines
// would not be.
function CandidateCard({
  candidate: c,
  index: i,
  busy,
  onPick,
}: {
  candidate: Candidate;
  index: number;
  busy: boolean;
  onPick: (c: Candidate) => void;
}) {
  const p = posture(c);
  const skipped = c.missions.filter((m) => m.skipped).length;
  const struggled = c.missions.filter((m) => (m.attempts ?? 0) >= 3).length;
  const reduced = useReducedMotion();

  const rotateX = useSpring(useMotionValue(0), { stiffness: 300, damping: 22 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 300, damping: 22 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, color-mix(in srgb, ${p.color} 18%, transparent) 0%, transparent 60%)`;

  function onMouseMove(e: MouseEvent<HTMLButtonElement>) {
    if (reduced || busy) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    rotateY.set(((px - 50) / 50) * 6);
    rotateX.set((-(py - 50) / 50) * 6);
    glareX.set(px);
    glareY.set(py);
  }

  function onMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{
        layout: { duration: 0.45, ease: [0.32, 0.72, 0, 1] },
        default: { duration: 0.2, delay: Math.min(i * 0.015, 0.18) },
      }}
      whileHover={busy ? undefined : { y: -2 }}
      whileTap={busy ? undefined : { scale: 0.99 }}
      disabled={busy}
      onClick={() => onPick(c)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 700 }}
      className="group relative overflow-hidden rounded-xl border border-line bg-panel p-4 text-left shadow-sm transition-shadow hover:shadow-lg disabled:opacity-40"
    >
      {/* Left accent bar in the posture colour -- a real positioned element,
          not a box-shadow trick (an inset offset shadow with no blur/spread
          paints a thin ring around all four sides, not just one). */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
        style={{ background: p.color }}
      />
      {/* A soft sheen following the posture colour -- visible only on hover,
          so the card reads as crafted rather than a flat bordered box. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-20"
        style={{ background: p.color }}
      />
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glareBackground }}
        />
      )}
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[15px] font-medium">{c.member.name}</span>
        <span
          className="mono flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider"
          style={{ color: p.color }}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          {p.label}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[13px] text-muted">
        {c.member.jobRole} · {c.member.yearsExperience}y
      </p>
      <p className="mono mt-2.5 text-[11px] text-faint">
        {c.signals.missionsFirstTry}/{c.signals.missionsCompleted} first try
        {struggled > 0 && ` · ${struggled} struggled`}
        {skipped > 0 && ` · ${skipped} skipped`}
      </p>
    </motion.button>
  );
}

function overallScore(r: ReportSummary): number {
  const d = r.meta.dimensions;
  const knowledge = ["correctness", "depth", "specificity"].filter((k) => d[k] !== undefined);
  if (!knowledge.length) return 0;
  return knowledge.reduce((sum, k) => sum + d[k], 0) / knowledge.length;
}
