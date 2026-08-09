"use client";

import { motion } from "motion/react";
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI Interview Agent</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
          Pick a candidate. The agent reads their 31-day cohort record, builds an interview plan
          from what they struggled with, skipped, or passed too easily, and adapts as they answer.
        </p>
        <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-faint">
          Good answers lead with what you actually built — numbers, trade-offs, what broke —
          over correct-sounding vocabulary.
        </p>
      </motion.div>

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
              disabled={busy}
              onClick={() => onPick(c)}
              className="rounded-xl border border-line bg-panel p-4 text-left transition-colors hover:bg-panel-2 disabled:opacity-40"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[15px] font-medium">{c.member.name}</span>
                <span className="mono shrink-0 text-[10px] uppercase tracking-wider" style={{ color: p.color }}>
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
