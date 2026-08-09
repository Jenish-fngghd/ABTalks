"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { CountUp } from "@/components/CountUp";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Feedback, Meta } from "@/lib/api";

function toMarkdown(name: string, feedback: Feedback, meta: Meta, overall: number, comms?: number): string {
  const lines = [
    `# Interview report — ${name}`,
    "",
    `${meta.questionsAsked} questions across ${meta.daysCovered.length} curriculum days`,
    `Knowledge: ${overall.toFixed(1)}/5.0${comms !== undefined ? `  ·  Communication: ${comms.toFixed(1)}/5.0` : ""}`,
    "",
    "## Summary",
    feedback.summary,
    "",
    "## Strengths",
    ...feedback.strengths.map((s) => `- ${s}`),
    "",
    "## Gaps",
    ...feedback.gaps.map((s) => `- ${s}`),
    "",
    "## Next steps",
    ...feedback.next.map((s) => `- ${s}`),
  ];
  if (meta.perDay?.length) {
    lines.push("", "## By curriculum day");
    for (const d of meta.perDay) {
      const tags = [d.bluffing && "bluff", d.undersells && "undersold"].filter(Boolean).join(", ");
      lines.push(`- Day ${d.day} — ${d.title}: ${d.score.toFixed(1)}/5${tags ? ` (${tags})` : ""}`);
    }
  }
  return lines.join("\n");
}

const AXES: { key: string; label: string; note: string; group: string }[] = [
  { key: "correctness", label: "Correctness", note: "Was it technically true?", group: "What you know" },
  { key: "depth", label: "Depth", note: "Mechanism, or restated definition?", group: "What you know" },
  { key: "specificity", label: "Specificity", note: "Real systems, numbers, decisions?", group: "What you know" },
  { key: "terminology", label: "Terminology", note: "Fluency with the vocabulary", group: "How you said it" },
  {
    key: "communication",
    label: "Communication",
    note: "Would this land in a real interview?",
    group: "How you said it",
  },
];

function tone(score: number) {
  if (score >= 3.5) return "var(--good)";
  if (score >= 2) return "var(--warn)";
  return "var(--bad)";
}

export function Report({
  feedback,
  meta,
  name,
  onRestart,
}: {
  feedback: Feedback;
  meta: Meta;
  name: string;
  onRestart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const axes = AXES.filter((a) => meta.dimensions?.[a.key] !== undefined);
  // Headline is knowledge only. Communication is reported beside it, never averaged
  // into it -- they are different problems with different fixes.
  const knowledge = ["correctness", "depth", "specificity"].filter(
    (k) => meta.dimensions?.[k] !== undefined,
  );
  const overall = knowledge.length
    ? knowledge.reduce((sum, k) => sum + meta.dimensions[k], 0) / knowledge.length
    : 0;
  const comms = meta.dimensions?.communication;

  // Fluent vocabulary with nothing concrete underneath.
  const bluffGap = (meta.dimensions?.terminology ?? 0) - (meta.dimensions?.specificity ?? 0);
  // The opposite, and the more fixable one: knows it, explains it badly.
  const undersold = overall >= 3 && comms !== undefined && comms <= 2;

  async function copyReport() {
    await navigator.clipboard.writeText(toMarkdown(name, feedback, meta, overall, comms));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <p className="mono text-[11px] uppercase tracking-[0.16em] text-faint">
            Interview complete
          </p>
          <h1 className="font-display mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            {name}
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            {meta.questionsAsked} questions across {meta.daysCovered.length} curriculum days
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <motion.button
            onClick={copyReport}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="mono flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 text-[12px] text-muted transition-colors hover:bg-panel-2"
          >
            <motion.svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              initial={false}
              animate={copied ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.35 }}
            >
              {copied ? (
                <path
                  d="M4 12l5 5L20 6"
                  stroke="var(--good)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <>
                  <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </>
              )}
            </motion.svg>
            {copied ? "Copied" : "Copy report"}
          </motion.button>
          <ThemeToggle />
        </div>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="relative mt-10 overflow-hidden rounded-2xl border border-line bg-panel p-6 shadow-lg sm:p-8"
      >
        {/* A quiet radial glow behind the score, coloured to match it -- the score
            card is the report's single highest-weight surface, so it earns depth
            the section cards below it don't need. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: tone(overall) }}
        />
        <div className="flex items-end gap-4">
          <motion.span
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <CountUp
              to={overall}
              from={0}
              decimals={1}
              delay={0.2}
              duration={1.1}
              className="mono text-5xl font-semibold tabular-nums"
              style={{ color: tone(overall) }}
            />
          </motion.span>
          <span className="mono pb-1.5 text-sm text-faint">/ 5.0 knowledge</span>
          {comms !== undefined && (
            <span className="mono pb-1.5 text-sm text-muted">
              · {comms.toFixed(1)} communication
            </span>
          )}
        </div>

        <div className="mt-7 flex flex-col gap-5">
          {axes.map((axis, i) => {
            const score = meta.dimensions[axis.key];
            const startsGroup = i === 0 || axes[i - 1].group !== axis.group;
            return (
              <div key={axis.key}>
                {startsGroup && (
                  <p className="mono mb-2 text-[10px] uppercase tracking-[0.16em] text-faint">
                    {axis.group}
                  </p>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-medium">{axis.label}</span>
                  <span className="mono text-[13px] tabular-nums" style={{ color: tone(score) }}>
                    {score.toFixed(1)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: tone(score) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(score / 5) * 100}%` }}
                    transition={{
                      duration: 0.7,
                      delay: 0.25 + i * 0.08,
                      ease: [0.32, 0.72, 0, 1],
                    }}
                  />
                </div>
                <p className="mt-1 text-[12px] text-faint">{axis.note}</p>
              </div>
            );
          })}
        </div>

        {bluffGap >= 2 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 rounded-xl border border-line bg-panel-2 px-4 py-3 text-[13px] leading-relaxed text-muted"
          >
            <strong className="text-warn">Vocabulary outran substance.</strong> Terminology
            scored {meta.dimensions.terminology.toFixed(1)} against specificity{" "}
            {meta.dimensions.specificity.toFixed(1)} — the right words were there, the concrete
            detail behind them often was not.
          </motion.p>
        )}

        {undersold && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 rounded-xl border border-line bg-panel-2 px-4 py-3 text-[13px] leading-relaxed text-muted"
          >
            <strong className="text-accent">You know more than you showed.</strong> Knowledge
            scored {overall.toFixed(1)} against communication {comms?.toFixed(1)} — the
            engineering is there and the delivery is costing you credit for it. That is the
            most fixable gap on this page.
          </motion.p>
        )}
      </motion.section>

      <Section title="Summary" delay={0.16}>
        <p className="text-[15px] leading-relaxed text-muted">{feedback.summary}</p>
      </Section>

      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        <List title="Strengths" items={feedback.strengths} color="var(--good)" delay={0.22} />
        <List title="Gaps" items={feedback.gaps} color="var(--bad)" delay={0.28} />
        <List title="Next" items={feedback.next} color="var(--accent)" delay={0.34} />
      </div>

      {meta.perDay?.length > 0 && (
        <Section title="By curriculum day" delay={0.4}>
          <ul className="flex flex-col gap-3">
            {meta.perDay.map((d, i) => (
              <motion.li
                key={d.day}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.42 + i * 0.04 }}
                className="flex items-center gap-4"
              >
                <span className="mono w-14 shrink-0 text-[12px] text-faint">Day {d.day}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{d.title}</span>
                {d.bluffing && (
                  <span className="mono shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] uppercase text-warn">
                    bluff
                  </span>
                )}
                {d.undersells && (
                  <span className="mono shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] uppercase text-accent">
                    undersold
                  </span>
                )}
                <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-line">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: tone(d.score) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.score / 5) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.45 + i * 0.04 }}
                  />
                </div>
                <span className="mono w-8 shrink-0 text-right text-[12px] tabular-nums text-muted">
                  {d.score.toFixed(1)}
                </span>
              </motion.li>
            ))}
          </ul>
        </Section>
      )}

      {meta.topicsNotAssessed?.length > 0 && (
        <Section title="Not assessed" delay={0.46}>
          {/* Stated rather than left silent: a candidate should know whether they did
              badly at MCP or were simply never asked about it. */}
          <p className="mb-3 text-[13px] leading-relaxed text-muted">
            This interview followed your cohort record, so these topics never came up. They
            were not assessed — not assessed badly.
          </p>
          <ul className="flex flex-wrap gap-2">
            {meta.topicsNotAssessed.map((t) => (
              <li
                key={t.topic}
                className="rounded-md border border-line bg-panel px-2.5 py-1 text-[12px] text-muted"
              >
                {t.topic}
                <span className="mono ml-1.5 text-[10px] text-faint">
                  day{t.days.length > 1 ? "s" : ""} {t.days.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <motion.button
        onClick={onRestart}
        whileHover={{ y: -1, borderColor: "var(--accent)" }}
        whileTap={{ scale: 0.98 }}
        className="mt-12 flex items-center gap-2 rounded-xl border border-line bg-panel px-5 py-3 text-[14px] font-medium"
      >
        Interview another candidate
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.button>
    </main>
  );
}

function Section({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="mt-10"
    >
      <h2 className="mono mb-3 text-[11px] uppercase tracking-[0.16em] text-faint">{title}</h2>
      {children}
    </motion.section>
  );
}

function List({
  title,
  items,
  color,
  delay,
}: {
  title: string;
  items: string[];
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <h2 className="mono mb-3 text-[11px] uppercase tracking-[0.16em]" style={{ color }}>
        {title}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-muted">
            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: color }} />
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
