"use client";

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
          <button
            type="button"
            onClick={() => onSend("I don't know this one, honestly.")}
            className="rounded-full border border-line px-3 py-1 text-[12px] text-muted transition-colors hover:bg-panel-2"
          >
            I don't know this one
          </button>
          <button
            type="button"
            onClick={() => onSend("Can you clarify the question?")}
            className="rounded-full border border-line px-3 py-1 text-[12px] text-muted transition-colors hover:bg-panel-2"
          >
            Ask for clarification
          </button>
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
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-xl bg-accent px-4 py-3 text-[14px] font-medium text-white transition-opacity disabled:opacity-30"
        >
          Send
        </button>
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
