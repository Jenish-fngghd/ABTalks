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

---

### [6] 2026-08-08 — Frontend, live model testing, and what testing exposed
**Author:** Yash · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim, keys redacted):**
> proceed in the direction that is correct and best and groq api keys: "[REDACTED]" and also
> you can explore recent nvidia models its api keys: "[REDACTED]" do whatever is best for us
> i want the aboslute best system design, results possible ever

**Produced:** `web/` (Next.js 16 + Tailwind v4 + motion), `Dockerfile`, `render.yaml`,
provider fallback in `app/llm.py`, `eval/bench_models.py` fixes.

**Model research, from live `/models` endpoints rather than memory:** Groq production models
verified at <https://console.groq.com/docs/models>; deprecated IDs (`qwen3-32b`,
`llama-4-scout`, `kimi-k2`) excluded per <https://console.groq.com/docs/deprecations>.
NVIDIA NIM returned 100 models; shortlisted across five families so the choice was not an
accident of which provider we tried first.

**Four things live testing exposed that offline testing could not:**

1. **The interviewer re-asked near-identical questions.** With two follow-ups per slot and
   a candidate giving the same non-answer twice, `gpt-oss-120b` happily asked "can you
   describe the Streamlit chat UI…" twice in a row. Root cause: the follow-up policy had no
   check on whether probing was working. A slot now earns a second probe only if the first
   one moved the score.

2. **The bench was measuring itself.** Every model reported 0.0. `score_once` had
   re-implemented JSON parsing with no retry, instead of calling the `structured()` helper
   that already existed one file over. Deleted the duplicate; the bench now runs the same
   path the app does.

3. **`run_eval` was silently burning live tokens.** It picked up `.env` automatically, and
   consumed a provider's entire daily allowance. It is now offline unless `--live`.

4. **Key rotation was the wrong fix for rate limits.** The first attempt rotated between the
   three supplied Groq keys. The 429 body names an *organization* — all three share one
   200k tokens/day allowance, so rotation buys nothing. Replaced with a fallback to a second
   provider, verified against a genuinely exhausted primary: the interview continued on
   NVIDIA NIM instead of failing mid-session.

**Also rejected:** 21st.dev and motion MCP components. Both servers were reported as
enabled but neither exposed any tools in this session, so the UI was built directly with
Tailwind and the `motion` package rather than claiming components that were never pulled.

**Also fixed:** `next@15` shipped 3 high-severity advisories (postcss, sharp);
upgrading to `next@16.3.0` cleared all of them (`npm audit`: 0 vulnerabilities).

**Three more defects the model bench exposed — all in this repo, none in any model:**

5. **The schema example was anchoring the scorer.** Adding a filled-in JSON example fixed
   first-try validity (0/5 → 15/15) and halved latency, but its concrete numbers
   (`correctness: 3 … terminology: 4`) dragged every model's scores toward them — all four
   models rated the bluffer *exactly* 2.0, which is what made it visible. Replacing them
   with `<integer 0-5>` placeholders moved gpt-oss-20b's gap from 1.0 to 3.88 and
   nemotron-3-super's from 0.0 to 2.89.

6. **The bluff rule depended on the model's calibration.** `Assessment.bluffing` required
   `terminology >= 4`, but models rate terminology very differently — some score a plainly
   jargon-heavy answer 2/5, so the flag silently never fired. Redefined as a gap
   (`terminology - specificity >= 2`): detection is 3/3 on every model tested.

7. **Only rate limits triggered the fallback.** A live interview died on
   `APIConnectionError` from the NIM endpoint. Transient connection errors, timeouts, and
   5xx now fall back too.

**Confirmed working against a live model 1** (`gpt-oss-120b`, CAND-006, persistent-grinder):
bluff answer scored `correctness 1, depth 1, specificity 0, terminology 4` and was flagged,
triggering a demand for concrete parameters; the strong answer scored `5/4/5/5`; the
injection attempt scored straight zeros and the interview continued to all 8 questions
across 8 days. The generated feedback listed exactly one strength, because only one answer
had earned one.

---

### [7] 2026-08-08 — Breeth correction, prior-art review, and making the graph load-bearing
**Author:** Yash · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim):**
> now can you tell me where you have used the breeth [screenshot of Breeth Pro access card]
> they have provided us with this and after that i want you below open source projects that
> i have found, can you check if they are relevant to us in anyway and provide better
> mechanism or methodology and after that can you tell where are you logging all this like i
> have told you for gragh engineering or graphify and many more have you used them or not
> and if not why

**Correction — Breeth was misidentified.** Entry [2] recorded the sponsor account as
"breeth" and §4 of `RESEARCH_PROMPT.md` described it as a GPU inference platform serving
open-weight models. That was inferred from the name and it was wrong. Breeth
(<https://www.thebreeth.com/>) is an **intent-aware memory layer for AI agents**: a graph of
entities and edges where each fact carries `cognitive_pattern`, `why_connected`, and
`director_vision`, with confidence decay and retraction, reachable over MCP or REST. It is
not a model provider. §4 now records the correction rather than quietly editing it, and a
new §4b covers where an agent memory layer does and does not belong here.

**Breeth adoption decision: not in the product runtime.** Two reasons, both concrete.
Cross-session memory is explicitly out of scope for this problem statement. And the overlap
is already built: Breeth's `cognitive_pattern` is the same idea as this project's candidate
*posture* (`fast-grasp` / `steady` / `persistent-grinder`), and `why_connected` is the same
idea as `PlannedQuestion.reason` — both derived deterministically from the candidate record
in about 40 lines, with no network call and no candidate data leaving the process.
Replacing working local logic with a hosted dependency would add a live-demo failure mode.
Dev-time use as an MCP memory server for the coding assistant remains uncontroversial.

**Prior art reviewed** (all three suggested; none supplied a better mechanism for the core
problem, and no code was copied from any of them):

| Project | License / stars | Verdict |
|---|---|---|
| [IliaLarchenko/Interviewer](https://github.com/IliaLarchenko/Interviewer) | Apache-2.0, 119★ | Env-var LLM abstraction (`LLM_TYPE`/`LLM_URL`/`LLM_NAME`) is the same approach already used here (`LLM_BASE_URL`/`LLM_MODEL`). Confirms the design; nothing to take. |
| [yizucodes/interview-agent](https://github.com/yizucodes/interview-agent) | Educational-use only, 9★ | Closest conceptual blueprint, but its RAG (ChromaDB, 1000/200 chunking) exists because project docs are unbounded — our curriculum is 4.4k tokens and fits in the prompt, so adopting it would be strictly worse. Its vague-answer challenge is delegated to model judgement; ours is a measured four-axis rule with a gap threshold. **Licence is not permissive — code could not be reused regardless.** |
| [FoloUp](https://github.com/FoloUp/FoloUp) | MIT, 1.2k★ | Next.js + Tailwind + shadcn + Supabase. Question generation is a single "LLM reads the job description" call with no coverage guarantee. Its one genuinely better idea is **persistence** (Postgres-backed sessions) against our in-memory store — logged as a known limitation rather than adopted, since the problem statement puts persistent accounts out of scope. |

The common gap across all three: every one generates questions from a source document with
an LLM call. None guarantees topic coverage, and none separates terminology from
specificity, so none can distinguish a fluent answer from a substantive one.

**Graph engineering — a promise that had not been kept.** `RESEARCH_PROMPT.md` §3d required
deciding the curriculum graph "with a number", and that test had never been run. Auditing
it: `downstream()` was used in exactly one place, decorating the `reason` string, with zero
effect on question selection, and `blocked_by()` / `module_title()` were dead code — a
violation of this project's own no-dead-code rule.

Fixed by making the graph decide something. A skipped day is now interrogated **through the
nearest later day the candidate actually completed**, because asking someone to explain a
day they were absent for only confirms they were absent. Dead code deleted.

**The number §3d asked for: the graph redirects a question for 11 of 20 candidates
(15 of 160 questions).** It is now reported by `run_eval` on every run, with the standing
instruction that if it ever reaches zero the graph should be deleted rather than kept.

Verified live: for CAND-011 (skipped Day 7, Embeddings) the agent asked *"how you integrated
the retrieval system with the conversation memory in your final healthcare chatbot demo"* —
a Day 31 question that cannot be answered well without Day 7, and which never mentions the
skip. Known limitation: 5 of the 15 bridges land on Day 31, because the capstone is the
catch-all downstream day when a candidate's record is sparse.

**Graphify: still not used**, decision unchanged from entry [3] — it is a dev-time code
knowledge graph, and this repo is 40 files. Recorded here so the "not used, and why" is
explicit rather than implied.

---

### [8] 2026-08-08 — Second pass against the research prompt
**Author:** Yash · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim):**
> now i want you to again read the @RESEARCH_PROMPT.md and starts implementing again and
> validating again and then comparing it with current setup and do that effectively i want
> you to generate the tasks this time, i want every single item to be implemented that is
> mentined in the research prompt, so you do not forget anything, i want the best possible
> results, system design etc ever that will the sota, everything should be the best as
> possible do whatever you want to achieve that.

**Produced:** `DESIGN.md`, `scripts/check_secrets.py`, `scripts/pre-commit`,
`.github/workflows/ci.yml`, README architecture diagram, plus changes to `curriculum.py`,
`interviewer.py`, `main.py`, `llm.py`, `run_eval.py`.

**The largest gap, found by re-reading line 3 of the prompt:** *"Output is a specification
document, not an implementation."* We had built the implementation and never written the
document. `DESIGN.md` is that deliverable, in §7's exact order.

**Measurements that changed decisions (each was run, not estimated):**

- **Curriculum in the prompt.** Costed three options against the 200k tokens/day cap: full
  curriculum text ~5016 tok/turn → 39 turns/day; index + current day ~2293 → 87; current day
  only ~1893 → 105. The full text is about two interviews before lockout. Shipped the middle
  option — 928-token cached prefix, over Groq's 128-1024 minimum.
- **Prompt caching.** Groq documents 50%-off cached prefixes with cached tokens exempt from
  rate limits, which would have changed those numbers substantially. Inspected the raw
  response body: this account returns no `prompt_tokens_details.cached_tokens` field at all.
  Recorded as UNVERIFIED and explicitly not relied upon.
- **Transcript growth.** Was the only unbounded part of the prompt. Now elides from the
  middle past 6000 chars — chosen over an LLM rolling summary because summarising costs a
  call per turn and can silently drop the detail an assessment rested on.

**Rejected, with reasons rather than preferences:**
- **pyBKT** (273★, MIT) — Bayesian Knowledge Tracing needs sequential observations per skill.
  Our candidates have ~10 missions with one observation each, so the model is not estimable
  on this data. A mathematical reason, not a taste one.
- **LangGraph** (39.2k★) and **PydanticAI** (19.1k★) — checkpointing earns its keep on
  branching long-running graphs; ours is eight sequential slots in one process.
- **promptfoo** (24.1k★) — cannot score a persona *through* our planner and parser.
- **21st.dev components** — searched the catalogue and reviewed five. Not installed: they are
  shadcn-registry shaped and this app is Tailwind-only, and the chat components are
  demo-shaped (iPhone frames, marketing reveals) rather than product-shaped. Our two most
  important surfaces have no catalogue equivalent.
- **Cursor Mixture of Kittens** — fetched before judging, as the research prompt required. It
  is a fused GPU kernel for MoE *training* on GB300 NVL72 hardware. Nothing transfers.

**Bugs this pass found and fixed:**
1. **Concurrent turns on one session were unguarded.** `store` had a lock but `Session` did
   not, so a double-submit interleaved two turns' writes. Added a non-blocking per-session
   lock returning 409. Verified over real HTTP: two simultaneous POSTs return `[200, 409]`.
2. **The offline stand-in cited no curriculum days.** Found by the *new* assertion that
   feedback must reference real days — the test double was not structurally representative,
   so the assertion was testing the stub rather than the product. Fixed the stub.
3. **A stale uvicorn masked a test.** The first concurrency test returned `[200, 200]`; the
   bind error in the log showed an old server from a previous session still held port 8000,
   so the request never reached the new code. Killed it and retested properly.

**Papers verified this pass** (fetched, not recalled): Liu et al. *Lost in the Middle* (TACL
2023, arXiv:2307.03172) — drove putting durable instructions first and the scored answer
last; Zheng et al. *Judging LLM-as-a-Judge* (NeurIPS 2023, arXiv:2306.05685) — verbosity bias
is why specificity is scored separately from length; Wuttke et al. (arXiv:2410.01824); Guan
et al. (arXiv:2503.22458); Pei et al. (arXiv:2507.05528); Siyan et al. (arXiv:2511.23376),
whose finding that passive-only personalization is insufficient is recorded as an open
question because our system is currently passive-only.

**Verified:** `check_secrets.py` clean on 43 tracked files and exit 1 on a planted key;
`run_eval --all` passes for all 20 candidates including the new follow-up-rate, day-citation,
transcript-budget and concurrency assertions; `next build` clean; `/health` live; a
rate-limited live run recovered through retry rather than failing.
