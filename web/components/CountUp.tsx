"use client";

// Sourced from the React Bits registry (https://reactbits.dev, MIT) via the
// shadcn MCP server, adapted to this file's naming convention (named export,
// matching every other component here). Used for the report's headline
// score -- DESIGN.md's motion spec calls the score reveal the "money-shot"
// moment; a static number landing is a weaker version of that than counting
// up to it.
import { useInView, useMotionValue, useSpring } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

export function CountUp({
  to,
  from = 0,
  delay = 0,
  duration = 1.2,
  decimals,
  className = "",
  style,
}: {
  to: number;
  from?: number;
  delay?: number;
  duration?: number;
  // Explicit, not inferred: the original component guessed decimal places from
  // `n.toString()`, which silently drops to 0 decimals whenever a value lands on
  // a whole number -- (0).toString() is "0", not "0.0". A score of exactly 0
  // rendered as a bare "0" instead of "0.0", inconsistent with every other score
  // on the report (all formatted via .toFixed(1)). This is what those pass.
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(from);

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);
  const springValue = useSpring(motionValue, { damping, stiffness });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const inferDecimals = (n: number) => {
    const s = n.toString();
    return s.includes(".") ? s.split(".")[1].length : 0;
  };
  const maxDecimals = decimals ?? Math.max(inferDecimals(from), inferDecimals(to));

  const format = useCallback(
    (latest: number) =>
      latest.toLocaleString("en-US", {
        minimumFractionDigits: maxDecimals,
        maximumFractionDigits: maxDecimals,
      }),
    [maxDecimals],
  );

  useEffect(() => {
    if (ref.current) ref.current.textContent = format(from);
  }, [from, format]);

  useEffect(() => {
    if (!isInView) return;
    const t = setTimeout(() => motionValue.set(to), delay * 1000);
    return () => clearTimeout(t);
  }, [isInView, motionValue, to, delay]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) ref.current.textContent = format(latest);
    });
    return () => unsubscribe();
  }, [springValue, format]);

  return <span className={className} style={style} ref={ref} />;
}
