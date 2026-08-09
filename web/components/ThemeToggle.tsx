"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

export function ThemeToggle() {
  // Mirrors whatever the blocking inline script in layout.tsx already set on
  // <html> before paint -- this only needs to read it back, never decide it,
  // or the icon would flash the wrong state on load.
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Light is the default regardless of OS preference (see globals.css) -- no
    // data-theme attribute means light, full stop, not "check the OS instead".
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  }

  if (dark === null) return <div className="h-8 w-8" aria-hidden />;

  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-panel text-muted transition-colors hover:text-text"
    >
      <motion.div
        key={dark ? "moon" : "sun"}
        initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      >
        {dark ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </motion.div>
    </motion.button>
  );
}
