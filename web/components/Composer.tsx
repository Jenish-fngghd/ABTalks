"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ANSWER_CHAR_LIMIT } from "@/lib/api";

const WARN_AT = ANSWER_CHAR_LIMIT - 1000; // give a heads-up before the hard cutoff

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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  }

  return (
    <div className="border-t border-line bg-panel px-5 py-4 sm:px-8">
      {/* Optional nudges for a candidate who freezes rather than types nothing. Both
          phrases are ordinary natural language the model already classifies (intent
          "concede" / "clarify") -- these are a shortcut to typing them, not a new
          code path. Hidden once they start typing so they never look like the only
          two valid replies. */}
      {!disabled && !value && (
        <div className="mx-auto mb-2 flex max-w-2xl gap-2">
          <motion.button
            type="button"
            onClick={() => onSend("I don't know this one, honestly.")}
            whileHover={{ y: -1, borderColor: "var(--accent)" }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px] text-muted"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path d="M12 17.2h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            I don't know this one
          </motion.button>
          <motion.button
            type="button"
            onClick={() => onSend("Can you clarify the question?")}
            whileHover={{ y: -1, borderColor: "var(--accent)" }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px] text-muted"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path
                d="M4 5h16v11H8l-4 4V5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Ask for clarification
          </motion.button>
        </div>
      )}
      <div className="mx-auto flex max-w-2xl items-end gap-3">
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
          className="flex-1 resize-none rounded-xl border border-line bg-panel-2 px-4 py-3 text-[15px] leading-relaxed text-text placeholder:text-faint disabled:opacity-50"
        />
        <motion.button
          onClick={submit}
          disabled={disabled || !value.trim()}
          whileHover={!disabled && value.trim() ? { scale: 1.06 } : undefined}
          whileTap={!disabled && value.trim() ? { scale: 0.94 } : undefined}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          aria-label="Send answer"
          className="flex shrink-0 items-center justify-center rounded-full bg-accent p-3 text-white transition-opacity disabled:opacity-30"
        >
          {disabled ? (
            <motion.svg
              width="18"
              height="18"
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
