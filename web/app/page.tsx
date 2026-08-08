"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

import { CandidatePicker } from "@/components/CandidatePicker";
import { Composer } from "@/components/Composer";
import { CoveragePanel } from "@/components/CoveragePanel";
import { Report } from "@/components/Report";
import { Transcript, type Message } from "@/components/Transcript";
import { API_URL, post, type Candidate, type Feedback, type Meta } from "@/lib/api";

type Phase = "picking" | "interview" | "report";

export default function Page() {
  const [phase, setPhase] = useState<Phase>("picking");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/candidates`)
      .then((r) => r.json())
      .then((d) => setCandidates(d.candidates ?? []))
      .catch(() => setError("Could not reach the interview API. Is the backend running?"));
  }, []);

  const start = useCallback(async (c: Candidate) => {
    setBusy(true);
    setError(null);
    const id = `${c.member.id}-${Date.now()}`;
    try {
      const res = await post({ sessionId: id, candidate: c });
      setCandidate(c);
      setSessionId(id);
      setMeta(res.meta ?? null);
      setMessages([
        { role: "interviewer", text: res.reply, day: res.meta?.plan[0]?.day },
      ]);
      setPhase("interview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start the interview.");
    } finally {
      setBusy(false);
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      setMessages((m) => [...m, { role: "candidate", text }]);
      setBusy(true);
      setError(null);
      try {
        const res = await post({ sessionId, message: text });
        setMeta(res.meta ?? null);
        setMessages((m) => [
          ...m,
          {
            role: "interviewer",
            text: res.reply,
            day: res.meta?.plan[res.meta.currentSlot]?.day,
          },
        ]);
        if (res.done && res.feedback) {
          setFeedback(res.feedback);
          // Let the closing line land before the report takes over the screen.
          setTimeout(() => setPhase("report"), 900);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "The interviewer is unavailable.");
      } finally {
        setBusy(false);
      }
    },
    [sessionId],
  );

  const restart = useCallback(() => {
    setPhase("picking");
    setCandidate(null);
    setMessages([]);
    setMeta(null);
    setFeedback(null);
    setError(null);
  }, []);

  if (phase === "report" && feedback && meta && candidate) {
    return (
      <Report
        feedback={feedback}
        meta={meta}
        name={candidate.member.name}
        onRestart={restart}
      />
    );
  }

  if (phase === "picking") {
    return (
      <>
        <CandidatePicker candidates={candidates} onPick={start} busy={busy} />
        <ErrorBar error={error} />
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <CoveragePanel meta={meta} />
      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5 sm:px-8">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium">{candidate?.member.name}</p>
            <p className="truncate text-[12px] text-muted">{candidate?.member.jobRole}</p>
          </div>
          <button
            onClick={restart}
            className="shrink-0 text-[12px] text-muted transition-colors hover:text-text"
          >
            End
          </button>
        </header>
        <Transcript
          messages={messages}
          thinking={busy}
          thinkingDay={meta?.plan[meta.currentSlot]?.day}
        />
        <Composer onSend={send} disabled={busy} />
      </div>
      <ErrorBar error={error} />
    </div>
  );
}

function ErrorBar({ error }: { error: string | null }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-line bg-panel px-4 py-3 text-[13px] text-bad shadow-lg"
        >
          {error}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
