import type { Metadata } from "next";
import { MotionConfig } from "motion/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Interview Agent",
  description:
    "A technical interviewer that reads a candidate's 31-day AI cohort record and adapts to it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-text antialiased">
        {/* globals.css only zeroes plain CSS transitions -- every animation in this
            app is a Framer Motion `motion.*` component, which needs its own opt-in
            to honor the OS reduced-motion setting. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
