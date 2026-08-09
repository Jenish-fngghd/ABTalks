"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ANSWER_CHAR_LIMIT } from "@/lib/api";

const WARN_AT = ANSWER_CHAR_LIMIT - 1000; // give a heads-up before the hard cutoff

const QUICK_REPLIES: { text: string; label: string; icon: React.ReactNode }[] = [
  {
    text: "I don't know this one, honestly.",
    label: "I don't know this one",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M12 17.2h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </>
    ),
  },
  {
    text: "Can you clarify the question?",
    label: "Ask for clarification",
    icon: (
      <path
        d="M4 5h16v11H8l-4 4V5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    text: "Could you rephrase the question?",
    label: "Rephrase that",
    icon: (
      <path
        d="M20 11A8 8 0 1 0 18.6 15.5M20 5v6h-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    text: "I skipped this topic during the cohort.",
    label: "I skipped this topic",
    icon: (
      <path
        d="M5 5v14M8 6l10 6-10 6V6z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Focus returns to the input whenever the interviewer finishes speaking, so a
  // keyboard-only candidate never has to tab back into the conversation.
  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  // No cap on the grown height and no scrollbar: the textarea always resizes to
  // exactly fit its content, so overflow (and the scrollbar that comes with it)
  // never triggers. Answers are already bounded by ANSWER_CHAR_LIMIT above.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  }

  return (
    <div className="px-5 pb-5 pt-2 sm:px-8">
      {/* Optional nudges for a candidate who freezes rather than types nothing. All
          four are ordinary natural language the model already classifies (intent
          "concede" / "clarify") -- shortcuts to typing them, not a new code path.
          Hidden once they start typing so they never look like the only valid
          replies. */}
      {!disabled && !value && (
        <div className="mx-auto mb-2 flex max-w-2xl flex-wrap gap-2">
          {QUICK_REPLIES.map((q) => (
            <motion.button
              key={q.label}
              type="button"
              onClick={() => onSend(q.text)}
              whileHover={{ y: -1, borderColor: "var(--accent)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px] text-muted"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0">
                {q.icon}
              </svg>
              {q.label}
            </motion.button>
          ))}
        </div>
      )}

      {/* One bordered pill holding the whole composer -- no separate panel band
          behind it, no boxed toolbar section. Matches the floating-input pattern
          most chat products use (input reads as part of the conversation surface,
          not a form bolted underneath it). */}
      <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-3xl border border-line bg-panel-2 py-2 pl-4 pr-2 shadow-sm transition-shadow focus-within:border-accent/50 focus-within:shadow-md">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Answer in your own words — specifics beat vocabulary…"
          aria-label="Your answer"
          // The pill itself already shows focus (focus-within:border-accent below) --
          // the global *:focus-visible outline would double up on top of it here.
          className="flex-1 resize-none overflow-hidden bg-transparent py-1.5 text-[15px] leading-relaxed text-text placeholder:text-faint focus:outline-none disabled:opacity-50"
        />
        <motion.button
          onClick={submit}
          disabled={disabled || !value.trim()}
          whileHover={!disabled && value.trim() ? { scale: 1.06 } : undefined}
          whileTap={!disabled && value.trim() ? { scale: 0.94 } : undefined}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          aria-label="Send answer"
          className="flex shrink-0 items-center justify-center rounded-full bg-accent p-2.5 text-white transition-opacity disabled:opacity-30"
        >
          {disabled ? (
            <motion.svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="42 100"
              />
            </motion.svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 19V5M12 5L6 11M12 5L18 11"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </motion.button>
      </div>
      <div className="mx-auto mt-2 flex max-w-2xl items-center justify-between">
        <p className="text-[11px] text-faint">Enter to send · Shift+Enter for a new line</p>
        {value.length >= WARN_AT && (
          <p
            className={`mono text-[11px] ${
              value.length >= ANSWER_CHAR_LIMIT ? "text-bad" : "text-warn"
            }`}
          >
            {value.length >= ANSWER_CHAR_LIMIT
              ? `${value.length - ANSWER_CHAR_LIMIT} chars will be cut`
              : `${ANSWER_CHAR_LIMIT - value.length} chars left`}
          </p>
        )}
      </div>
    </div>
  );
}
