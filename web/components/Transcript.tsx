"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

export type Message = { role: "interviewer" | "candidate"; text: string; day?: number };

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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              className={m.role === "candidate" ? "flex justify-end" : ""}
            >
              {m.role === "interviewer" ? (
                <div>
                  {m.day !== undefined && (
                    <div className="mono mb-1.5 text-[11px] uppercase tracking-wider text-faint">
                      Day {m.day}
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
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent"
                    style={{ animationDelay: `${i * 0.16}s` }}
                  />
                ))}
              </div>
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
