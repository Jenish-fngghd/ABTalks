"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Meta } from "@/lib/api";

const POP = { type: "spring", stiffness: 640, damping: 22, mass: 0.7 } as const;

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
      className="relative flex w-full shrink-0 flex-col gap-5 overflow-hidden border-line bg-panel p-5 lg:h-dvh lg:w-[340px] lg:overflow-y-auto lg:border-r"
      aria-label="Interview plan and coverage"
    >
      {/* A quiet accent wash at the top of the panel -- the flat-panel version read
          as a form sidebar; this reads as a crafted surface, the way claude.ai's
          sidebar is never pure flat colour either. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full opacity-[0.06] blur-3xl"
        style={{ background: "var(--accent)" }}
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          {/* A four-point spark reads clearly at this size; the eight-point version
              (see ThinkingGlyph) needs more pixels to avoid collapsing into a plus
              sign, so this is a deliberately simpler mark, not the same glyph scaled
              down. */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-accent">
            <path d="M12 2 Q13 10.5 22 12 Q13 13.5 12 22 Q11 13.5 2 12 Q11 10.5 12 2 Z" fill="currentColor" />
          </svg>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
            Interview plan
          </h2>
          <span className="mono ml-auto text-xs text-muted">
            {meta.questionsAsked}/{meta.questionsPlanned}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full rounded-full bg-accent"
            style={{ boxShadow: "0 0 8px var(--accent)" }}
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
                  boxShadow: current ? "0 0 0 1px var(--accent)" : "0 0 0 0 transparent",
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
                    {current ? (
                      <ShimmerLabel text={q.topic} />
                    ) : (
                      <p className="truncate text-[13px] leading-snug text-muted">{q.topic}</p>
                    )}
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

      {/* claude.ai's sidebar footer identifies who's operating the session (the
          logged-in user). The candidate's identity already sits in the main
          header next to the transcript -- repeating it here would be redundant,
          not premium. What's actually parallel is the operator of *this*
          session: the interviewer itself. */}
      <div className="mt-auto flex items-center gap-2.5 border-t border-line pt-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-accent">
            <path d="M12 1 L14 10 L23 12 L14 14 L12 23 L10 14 L1 12 L10 10 Z" fill="currentColor" />
          </svg>
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[12px] font-medium text-text">Interviewer</p>
          <p className="mono truncate text-[10px] text-faint">adapts as you answer</p>
        </div>
      </div>
    </aside>
  );
}

// Tick pop-in and the shimmer sweep below are adapted from 21st.dev's "Task
// Steps" (https://21st.dev/@ddoemonn/components/task-steps, MIT, found via the
// 21st.dev MCP search) -- not a drop-in, since that component is index-linear
// (everything before `current` is done) where this plan is slot-based against
// daysCovered and has no error state, but the covered-tick animation and the
// active-row text treatment are a real upgrade over the flat dots this had.
function StatusDot({ covered, current }: { covered: boolean; current: boolean }) {
  const reduced = useReducedMotion();
  if (current) {
    return (
      <span className="relative mt-1.5 block h-2 w-2 shrink-0">
        <span className="absolute inset-0 rounded-full bg-accent" />
        <span className="thinking-dot absolute -inset-1 rounded-full bg-accent/30" />
      </span>
    );
  }
  return (
    <span className="relative mt-1 grid h-3.5 w-3.5 shrink-0 place-items-center">
      <AnimatePresence initial={false}>
        {covered ? (
          <motion.span
            key="done"
            className="col-start-1 row-start-1 grid h-3.5 w-3.5 place-items-center rounded-[4px] bg-good/15 text-good"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduced ? { duration: 0 } : POP}
          >
            <svg viewBox="0 0 256 256" width="9" height="9" fill="none" aria-hidden>
              <polyline
                points="216 72 104 184 48 128"
                stroke="currentColor"
                strokeWidth="28"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="pending"
            className="col-start-1 row-start-1 h-2 w-2 rounded-full border border-line bg-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0 }}
          />
        )}
      </AnimatePresence>
    </span>
  );
}

function ShimmerLabel({ text }: { text: string }) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <p className="truncate text-[13px] font-medium leading-snug text-text">{text}</p>;
  }
  return (
    <motion.p
      className="truncate bg-[linear-gradient(90deg,var(--muted)_38%,var(--text)_50%,var(--muted)_62%)] bg-clip-text text-[13px] font-medium leading-snug text-transparent [background-size:220%_100%]"
      animate={{ backgroundPosition: ["120% 0", "-120% 0"] }}
      transition={{ duration: 1.8, ease: "linear", repeat: Infinity }}
    >
      {text}
    </motion.p>
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
