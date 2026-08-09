import type { Metadata } from "next";
import { MotionConfig } from "motion/react";
import { Instrument_Sans, Fraunces } from "next/font/google";
import "./globals.css";

// Geometric-sans + editorial-serif pairing -- both OFL-licensed via next/font/google
// (self-hosted at build, no runtime request, no licensing ambiguity). Instrument Sans
// carries all UI text; Fraunces is reserved for display moments only (see .font-display).
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Interview Agent",
  description:
    "A technical interviewer that reads a candidate's 31-day AI cohort record and adapts to it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh bg-bg text-text antialiased">
        {/* globals.css only zeroes plain CSS transitions -- every animation in this
            app is a Framer Motion `motion.*` component, which needs its own opt-in
            to honor the OS reduced-motion setting. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
