"use client";

import { useEffect, useRef, useState } from "react";

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
      <p className="mx-auto mt-2 max-w-2xl text-[11px] text-faint">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
}
