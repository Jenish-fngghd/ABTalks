"use client";

import { motion } from "motion/react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Candidate } from "@/lib/api";

/** Same rule as the backend's Posture: how they learned, not just what they finished. */
function posture(c: Candidate) {
  const rate = c.signals.missionsCompleted
    ? c.signals.missionsFirstTry / c.signals.missionsCompleted
    : 0;
  if (rate >= 0.7) return { label: "Fast grasp", color: "var(--good)", rate };
  if (rate >= 0.35) return { label: "Steady", color: "var(--warn)", rate };
  return { label: "Persistent grinder", color: "var(--bad)", rate };
}

export function CandidatePicker({
  candidates,
  onPick,
  busy,
}: {
  candidates: Candidate[];
  onPick: (c: Candidate) => void;
  busy: boolean;
}) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
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

      {candidates.length === 0 && (
        <p className="mt-10 rounded-xl border border-line bg-panel px-4 py-3 text-[13px] text-muted">
          No candidate records loaded. The API reached <code className="mono">/api/candidates</code>{" "}
          but it came back empty — check that <code className="mono">data/candidates.json</code> is
          present on the backend.
        </p>
      )}

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {candidates.map((c, i) => {
          const p = posture(c);
          const skipped = c.missions.filter((m) => m.skipped).length;
          const struggled = c.missions.filter((m) => (m.attempts ?? 0) >= 3).length;
          return (
            <motion.button
              key={c.member.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.4) }}
              whileHover={busy ? undefined : { y: -2 }}
              whileTap={busy ? undefined : { scale: 0.99 }}
              disabled={busy}
              onClick={() => onPick(c)}
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
        })}
      </div>
    </main>
  );
}
