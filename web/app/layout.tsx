import type { Metadata } from "next";
import { MotionConfig } from "motion/react";
import localFont from "next/font/local";
import "./globals.css";

// Runs before paint so the toggle's stored choice never flashes the wrong theme
// first -- a plain useEffect in ThemeToggle would apply one frame too late.
const THEME_INIT_SCRIPT = `
  try {
    var stored = localStorage.getItem("theme");
    if (stored) document.documentElement.dataset.theme = stored;
  } catch (e) {}
`;

// Matter carries all UI text; SeasonMix is reserved for display moments only
// (see .font-display). Self-hosted local fonts, no runtime request.
const matter = localFont({
  src: [
    { path: "./fonts/MatterRegular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/MatterMedium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/MatterSemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});
const seasonMix = localFont({
  src: [
    { path: "./fonts/SeasonMix-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/SeasonMix-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Interview Agent",
  description:
    "A technical interviewer that reads a candidate's 31-day AI cohort record and adapts to it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${matter.variable} ${seasonMix.variable}`}
      // The theme-init script deliberately sets data-theme on this element before
      // React hydrates, which will never match the server-rendered markup (the
      // server can't know the client's stored preference). That's the intended
      // behaviour of the pattern, not a bug -- this tells React to accept it
      // instead of logging a hydration-mismatch error.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg text-text antialiased">
        {/* globals.css only zeroes plain CSS transitions -- every animation in this
            app is a Framer Motion `motion.*` component, which needs its own opt-in
            to honor the OS reduced-motion setting. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
