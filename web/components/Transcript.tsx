"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

export type Message = {
  role: "interviewer" | "candidate";
  text: string;
  day?: number;
  // Derived client-side from whether meta.currentSlot advanced -- true when this
  // line is a second probe on the same question rather than a new one. Carries no
  // score or verdict, only the fact that the agent chose to dig deeper.
  followup?: boolean;
};

export function Transcript({
  messages,
  thinking,
  thinkingDay,
}: {
  messages: Message[];
  thinking: boolean;
  thinkingDay?: number;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
      {/* Screen readers get each new turn announced without stealing focus from
          the input, which would break keyboard-only use mid-interview. */}
      <div className="mx-auto flex max-w-2xl flex-col gap-5" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={m.role === "candidate" ? "flex justify-end" : ""}
            >
              {m.role === "interviewer" ? (
                <div className={m.followup ? "border-l-2 border-accent/40 pl-3" : undefined}>
                  {m.day !== undefined && (
                    <div className="mono mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wider text-faint">
                      <span>Day {m.day}</span>
                      {m.followup && (
                        <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-accent">
                          digging deeper
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[15px] leading-relaxed text-text">{m.text}</p>
                </div>
              ) : (
                <p className="max-w-[85%] rounded-2xl rounded-br-md border border-line bg-panel px-4 py-2.5 text-[14px] leading-relaxed text-muted">
                  {m.text}
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {thinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5"
            >
              <ThinkingGlyph />
              {/* Scoring takes seconds. Naming what it is doing beats a bare spinner. */}
              <span className="text-[13px] text-muted">
                Assessing your answer{thinkingDay ? ` against Day ${thinkingDay}` : ""}…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={endRef} />
      </div>
    </div>
  );
}

/** An eight-point spark: continuous breathing rotation while a turn is scored,
 * standing in for a bare spinner the way naming the task beats "Loading…". */
function ThinkingGlyph() {
  return (
    <motion.svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 text-accent"
      animate={{ rotate: 360, scale: [1, 1.12, 1] }}
      transition={{
        rotate: { duration: 3.2, repeat: Infinity, ease: "linear" },
        scale: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <path
        d="M12 1 L14 10 L23 12 L14 14 L12 23 L10 14 L1 12 L10 10 Z"
        fill="currentColor"
      />
    </motion.svg>
  );
}
