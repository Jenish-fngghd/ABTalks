"use client";

// Filter-chip radiogroup, adapted from 21st.dev's "Filter Grid" component
// (https://21st.dev/@ddoemonn/components/filter-grid, MIT, via the 21st.dev MCP
// search) -- taking its chip mechanism (keyboard radiogroup navigation, a sliding
// layoutId thumb instead of a per-chip colour swap, live counts, useReducedMotion
// respected) and dropping its grid-reflow wrapper, since our candidate cards
// already own their own grid and motion (see CandidatePicker.tsx) and don't need
// a second grid system layered on top.
import { useCallback, useId, useRef, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";

const THUMB = { type: "spring", stiffness: 520, damping: 34, mass: 0.45 } as const;
const SWAP = { duration: 0.14 } as const;
const INSTANT = { duration: 0 } as const;

export type ChipFilter<T extends string> = { id: T; label: string };

export function FilterChips<T extends string>({
  label,
  filters,
  active,
  counts,
  onChange,
}: {
  label: string;
  filters: readonly ChipFilter<T>[];
  active: T;
  counts: Record<string, number>;
  onChange: (id: T) => void;
}) {
  const uid = useId();
  const reduced = useReducedMotion();
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, filters.findIndex((f) => f.id === active));

  const go = useCallback(
    (i: number) => {
      const next = filters[(i + filters.length) % filters.length];
      if (!next) return;
      chips.current[(i + filters.length) % filters.length]?.focus();
      onChange(next.id);
    },
    [filters, onChange],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(i + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(i - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0);
    } else if (e.key === "End") {
      e.preventDefault();
      go(filters.length - 1);
    }
  };

  const swap = reduced ? INSTANT : SWAP;

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter, i) => {
        const on = filter.id === active;
        return (
          <button
            key={filter.id}
            ref={(node) => {
              chips.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(filter.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className="group relative inline-grid h-7 select-none place-items-center rounded-full px-3 outline-none"
          >
            {on && (
              <motion.span
                aria-hidden
                layoutId={reduced ? undefined : `${uid}-thumb`}
                transition={THUMB}
                className="absolute inset-0 rounded-full"
                style={{ background: "var(--accent-soft)", border: "1px solid var(--accent)" }}
              />
            )}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 rounded-full border group-focus-visible:border-accent ${on ? "border-transparent" : "border-line"}`}
            />
            <span className="relative col-start-1 row-start-1 inline-grid">
              <motion.span
                aria-hidden
                initial={false}
                animate={{ opacity: on ? 0 : 1 }}
                transition={swap}
                className="col-start-1 row-start-1 inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] text-muted"
              >
                {filter.label}
                <span className="mono text-[10px] tabular-nums text-faint">
                  {counts[filter.id] ?? 0}
                </span>
              </motion.span>
              <motion.span
                aria-hidden
                initial={false}
                animate={{ opacity: on ? 1 : 0 }}
                transition={swap}
                className="col-start-1 row-start-1 inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-accent"
              >
                {filter.label}
                <span className="mono text-[10px] tabular-nums opacity-70">
                  {counts[filter.id] ?? 0}
                </span>
              </motion.span>
              <span className="sr-only">
                {filter.label}, {counts[filter.id] ?? 0}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
