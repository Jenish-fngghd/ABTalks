# AI Usage Log

Every meaningful AI interaction that shaped this repo, in order. Includes the prompts that
produced output we **rejected** — those are the honest part of the record.

Tooling: Claude Code (Claude Opus 5).

Template used for each entry:

```
### [n] YYYY-MM-DD — <what this was for>
**Author:** <name> · **Tool:** <tool / model>
**Prompt:** > verbatim
**Produced:** files touched
**Kept / rejected / fixed by hand:** ...
**Commit:** <sha>
```

---

### [1] 2026-08-08 — Research prompt for the problem statement
**Author:** Yash · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim, abridged where it quotes the published problem statement):**
> we have participated in the "https://www.abtalks.in/hackathon/" and we have been given
> three problem statements and have to select one [...] Chosen Problem Statement: The
> Interview Agent [...] now i want you to generate me the prompt that analyze the problem
> statements in detail with the help of the open source projects for the similar tasks
> (note to make sure every source is logged and they should be best ever possible) and
> recent research papers relevant to us, also for the ui/ux, animations etc i have enabled
> the 21st.dev and motion mcp protocol, i want the best possible system design, ui/ux ever
> possible [...] and also refer to the open source projects only for the file and folder
> structure

**Produced:** `RESEARCH_PROMPT.md` (v1)

**Kept:** the structure — mandatory source logging with URL/stars/license per project,
"recommend don't survey", and the rule that open source informs *folder structure only*
(imported logic is a Stage 2 authenticity risk).

**Rejected / fixed by hand:** v1 had no problem-analysis section and no rubric mapping,
despite the prompt asking for detailed analysis. Added in the next pass.

---

### [2] 2026-08-08 — Verify the research prompt, add model and technique research
**Author:** Yash · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim):**
> now first i want you to read the prompt given earlier for which you have generate the
> response and then verify again against the generated response and modify if needed and
> after that i am also thinking that we should also search open source models that we can
> use (google, nvidia, meta etc) and also i want the technologies or methods to be used is
> of the latest and best (like alternatives of the rag that has proven significantly
> better etc) and also i have came across this cursor open source project
> "https://cursor.com/blog/mixture-of-kittens" so i think we should include that also if
> needed and lastly i forgot to mention that they have also provided us the free starter
> berth account to be utilized and i also have its api key

**Produced:** `RESEARCH_PROMPT.md` §3a/§3b (RAG alternatives, inference-time techniques),
§4 (open-weight model selection across Meta/Google/NVIDIA/Qwen/DeepSeek/Mistral/Phi).

**Kept:** the RAG-alternatives survey, framed as *"measure the token count first, then
decide"* rather than "adopt the newest thing".

**Rejected:** including Cursor's Mixture of Kittens as architecture. It is an
inference-serving/MoE technique; this is an app-layer project. The prompt now instructs
the reader to fetch it, judge applicability, and **not include it for flavor**.

---

### [3] 2026-08-08 — Graph engineering: verify sources before adopting
**Author:** Yash · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim):**
> also what do you say about the graph engineering domain also
> "https://drive.google.com/file/d/1-GOg0kxcp8tx1BMUECMj2yJq6JYGmfhb/view" by the andrej
> karpathy agentic software engineering practice and also we can use the graphify for
> coding assistants

**Produced:** `RESEARCH_PROMPT.md` §3d.

**Rejected, and this one mattered:** the PDF is **not** by Karpathy. Fetching it surfaced
its own cover text — *"Independently compiled, July 2026 — not affiliated with Andrej
Karpathy and Anthropic — and not endorsed."* Citing it as a Karpathy paper would have been
a factual error a judge could catch in one search. §3d now carries a provenance warning and
points at the primary sources instead.

Also rejected: agent swarms and commit-DAG lineage from that document — they externalise
parallel experiment search across hundreds of runs; this is one candidate over ~10
sequential turns. And Graphify (verified real, Apache-2.0) is a dev-time tool for the
coding assistant, not a runtime component — noted as tooling, not architecture.

**Kept:** the framing *"each architecture externalises a different bottleneck"*, used to
justify the architecture choice, and the curriculum-as-prerequisite-graph idea — gated on
whether it beats a flat list.

---

### [4] 2026-08-08 — Submission requirements
**Author:** Yash · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim):**
> okay do the prompt includes standard folder structured and loggin every step in detail
> and also i have attached the image that specify the submission requirements

**Produced:** `RESEARCH_PROMPT.md` §0a (the three submission URL fields), §5.9 (concrete
repo tree requirements), §5.9a (this log's format and cadence rules).

**Fixed by hand:** the answer was no — folder structure had been delegated to "derive it
from the open-source projects" and the AI-usage log was a single line. Both were made
concrete.

---

### [5] 2026-08-08 — Backend implementation
**Author:** Yash · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim):**
> okay now you can consider @RESEARCH_PROMPT.md and starts implementation

**Produced:** `app/schemas.py`, `app/curriculum.py`, `app/profile.py`, `app/planner.py`,
`app/llm.py`, `app/interviewer.py`, `app/store.py`, `app/main.py`, `eval/run_eval.py`,
`requirements.txt`, `.env.example`, `.gitignore`, `README.md`.

**Measurements that drove the design** (taken before writing code, not assumed):
`curriculum.json` ≈ 4.4k tokens; largest candidate profile ≈ 300 tokens. The whole corpus
fits in one system prompt.

**Kept:** plan-as-code so the ≥8 questions / ≥4 days requirement is a guarantee rather than
a prompt instruction; four-axis scoring with `terminology` separated from `specificity` so
bluffing is detectable; one model call per turn (the model proposes a follow-up, the plan
decides whether it gets one).

**Rejected:**
- **A vector database / RAG pipeline** — cut on the token measurement above. Would have
  been a moving part buying nothing.
- **An LLM-inferred prerequisite graph** — the curriculum has no prerequisite edges, but
  module day-ranges are ordered, so ordering is derived in ~10 lines of Python. Asking a
  model to invent dependency edges would produce confident, unverifiable ones.
- **LangGraph / CrewAI** — an interview is a straight line through eight slots. A state
  framework on top of a `for` loop.
- **Two model calls per turn** (one to score, one to phrase). Merged into a single
  structured call returning assessment + next line, halving latency.

**Fixed by hand:**
- Token counting initially used `tiktoken`, which was not installed. Fell back to a
  character-based estimate rather than adding a dependency for a one-off measurement.
- The offline stand-in scorer had no branch for the interview-opening call and raised on
  the very first request. Added.
- The eval's plan check was first written as
  `Session.__new__(Session).__class__(...).plan` — unreadable. Replaced with a direct
  `build_plan()` call.
- Initially treated days absent from a candidate's mission list as *skipped*. Wrong:
  CAND-001 lists 10 missions but reports 30 completed, so the list is a sample. Those days
  are now `unknown`, and the interviewer is explicitly told not to accuse a candidate of
  skipping a day it has no record of.

**Verified:** `python -m eval.run_eval --all` — all 20 candidates produce compliant plans;
strong 4.0 > bluffer 2.0 > weak 0.0; the prompt-injection persona neither scores 5/5 nor
ends the interview early. Full interview driven over HTTP end to end: 8 turns to
`done: true` with feedback in the spec's shape.
