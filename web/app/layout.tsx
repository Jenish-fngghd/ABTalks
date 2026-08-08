import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Interview Agent",
  description:
    "A technical interviewer that reads a candidate's 31-day AI cohort record and adapts to it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
