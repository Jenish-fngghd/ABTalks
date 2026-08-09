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

// Mirrors app/store.py's MAX_AGE_SECONDS -- past this the backend session is gone,
// so resuming from a stale snapshot would just fail on the next turn anyway.
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const STORAGE_KEY = "interview-session";

type Snapshot = {
  savedAt: number;
  candidate: Candidate;
  sessionId: string;
  messages: Message[];
  meta: Meta | null;
  feedback: Feedback | null;
  phase: Phase;
};

function loadSnapshot(): Snapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as Snapshot;
    if (Date.now() - snap.savedAt > SESSION_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return snap;
  } catch {
    return null;
  }
}

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
  const [failedText, setFailedText] = useState<string | null>(null);

  // Restore an in-progress interview after a refresh. There is no safe way to ask
  // the backend "what state is this session in" -- the one endpoint would consume
  // a real turn -- so this replays the client's own last-known snapshot instead,
  // which is exactly what the backend still holds as long as the TTL hasn't passed.
  useEffect(() => {
    const snap = loadSnapshot();
    if (!snap) return;
    setCandidate(snap.candidate);
    setSessionId(snap.sessionId);
    setMessages(snap.messages);
    setMeta(snap.meta);
    setFeedback(snap.feedback);
    setPhase(snap.phase);
  }, []);

  useEffect(() => {
    if (phase === "picking" || !candidate) return;
    const snap: Snapshot = { savedAt: Date.now(), candidate, sessionId, messages, meta, feedback, phase };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  }, [phase, candidate, sessionId, messages, meta, feedback]);

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

  // isRetry skips the optimistic transcript push -- the message from the failed
  // attempt is already showing, so retrying it must not duplicate the bubble.
  const send = useCallback(
    async (text: string, isRetry = false) => {
      if (!isRetry) setMessages((m) => [...m, { role: "candidate", text }]);
      setBusy(true);
      setError(null);
      setFailedText(null);
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
        // The candidate's answer is already visible in the transcript -- give them a
        // way to resend it rather than making them retype into a stuck conversation.
        setFailedText(text);
      } finally {
        setBusy(false);
      }
    },
    [sessionId],
  );

  const retry = useCallback(() => {
    if (failedText) send(failedText, true);
  }, [failedText, send]);

  const restart = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
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
      <ErrorBar error={error} onRetry={failedText ? retry : undefined} />
    </div>
  );
}

function ErrorBar({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-[13px] shadow-lg"
        >
          <span className="text-bad">{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="shrink-0 rounded-lg border border-line bg-panel-2 px-2.5 py-1 text-[12px] font-medium text-text transition-colors hover:bg-line"
            >
              Retry
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
