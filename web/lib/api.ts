export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

// Must match ANSWER_CHAR_LIMIT in app/interviewer.py -- the backend truncates silently
// past this, so the composer needs to warn before that happens, not after.
export const ANSWER_CHAR_LIMIT = 6000;

export type PlannedQuestion = {
  day: number;
  module: number;
  topic: string;
  intent: "verify" | "bridge" | "depth" | "tradeoff" | "diagnose";
  difficulty: "warmup" | "core" | "deep" | "stress";
  reason: string;
  priority: number;
};

export type Meta = {
  dimensions: Record<string, number>;
  perDay: {
    day: number;
    title: string;
    score: number;
    bluffing: boolean;
    undersells: boolean;
  }[];
  topicsNotAssessed: { topic: string; days: number[] }[];
  questionsAsked: number;
  questionsPlanned: number;
  daysCovered: number[];
  daysPlanned: number[];
  difficulty: string;
  runningScore: number;
  posture: string;
  plan: PlannedQuestion[];
  currentSlot: number;
};

export type Feedback = {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
};

export type InterviewResponse = {
  reply: string;
  done: boolean;
  feedback?: Feedback;
  meta?: Meta;
};

export type Candidate = {
  member: {
    id: string;
    name: string;
    jobRole: string;
    yearsExperience: number;
    education: string;
    status: string;
  };
  missions: { day: number; title: string; passed?: boolean; attempts?: number; skipped?: boolean }[];
  signals: { commitDays: number; missionsCompleted: number; missionsFirstTry: number };
};

export async function post(
  body: { sessionId: string; candidate?: Candidate; message?: string },
): Promise<InterviewResponse> {
  const res = await fetch(`${API_URL}/api/interview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? `Request failed (${res.status})`);
  }
  return res.json();
}
