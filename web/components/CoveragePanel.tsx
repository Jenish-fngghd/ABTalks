"use client";

import { motion } from "motion/react";
import type { Meta } from "@/lib/api";

const INTENT_LABEL: Record<string, string> = {
  verify: "verify",
  bridge: "gap",
  depth: "depth",
  tradeoff: "trade-offs",
  diagnose: "diagnose",
};

const POSTURE_LABEL: Record<string, string> = {
  "fast-grasp": "Fast grasp",
  steady: "Steady",
  "persistent-grinder": "Persistent grinder",
};

/**
 * The interview plan, visible. Every question the agent will ask, why it chose
 * that curriculum day, and how far through it is. This is the part that
 * distinguishes an adaptive interviewer from a chatbot with a question list, so
 * it gets a permanent panel rather than being hidden behind the transcript.
 */
export function CoveragePanel({ meta }: { meta: Meta | null }) {
  if (!meta) return null;
  const progress = meta.questionsPlanned
    ? Math.min(1, meta.questionsAsked / meta.questionsPlanned)
    : 0;

  return (
    <aside
      className="flex w-full shrink-0 flex-col gap-5 border-line bg-panel p-5 lg:h-dvh lg:w-[340px] lg:overflow-y-auto lg:border-r"
      aria-label="Interview plan and coverage"
    >
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
            Interview plan
          </h2>
          <span className="mono text-xs text-muted">
            {meta.questionsAsked}/{meta.questionsPlanned}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip label="Posture" value={POSTURE_LABEL[meta.posture] ?? meta.posture} />
        <Chip label="Difficulty" value={meta.difficulty} />
        <Chip label="Days" value={`${meta.daysCovered.length}/${meta.daysPlanned.length}`} />
      </div>

      <ol className="flex flex-col gap-1">
        {meta.plan.map((q, i) => {
          const covered = meta.daysCovered.includes(q.day);
          const current = i === meta.currentSlot;
          return (
            <li key={`${q.day}-${i}`}>
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: current ? "var(--accent-soft)" : "rgba(0,0,0,0)",
                }}
                transition={{ duration: 0.35 }}
                className="rounded-lg px-3 py-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <StatusDot covered={covered} current={current} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="mono text-[11px] text-faint">Day {q.day}</span>
                      <span className="mono text-[10px] uppercase tracking-wider text-accent">
                        {INTENT_LABEL[q.intent] ?? q.intent}
                      </span>
                    </div>
                    <p
                      className={`truncate text-[13px] leading-snug ${
                        current ? "font-medium text-text" : "text-muted"
                      }`}
                    >
                      {q.topic}
                    </p>
                    {current && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.3 }}
                        className="mt-1.5 text-[12px] leading-relaxed text-muted"
                      >
                        {q.reason}
                      </motion.p>
                    )}
                  </div>
                </div>
              </motion.div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function StatusDot({ covered, current }: { covered: boolean; current: boolean }) {
  if (current) {
    return (
      <span className="relative mt-1.5 block h-2 w-2 shrink-0">
        <span className="absolute inset-0 rounded-full bg-accent" />
        <span className="thinking-dot absolute -inset-1 rounded-full bg-accent/30" />
      </span>
    );
  }
  return (
    <span
      className={`mt-1.5 block h-2 w-2 shrink-0 rounded-full ${
        covered ? "bg-good" : "border border-line bg-transparent"
      }`}
    />
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panel-2 px-2.5 py-1">
      <span className="text-[10px] uppercase tracking-wider text-faint">{label}</span>
      <span className="mono ml-1.5 text-[12px] text-text">{value}</span>
    </div>
  );
}
