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
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

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
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

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
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

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
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

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
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

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
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

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
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

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
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

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

---

### [9] 2026-08-09 — Cross-verification against the problem statement itself
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

**Prompts (verbatim, two in sequence):**
> now can you cross verify if everything asked has been implemented in the best possible
> manner or not and if not make it, i want the absolute best results and system design
> [followed by the full problem statement]

> cross verify by considering all possible different perspectives of seeing the problem i
> want every cases should be covered in best possible manner

> proceed in the direction that is correct and best for us by considering the results for
> the above cross verification, i want the absolute best such that all the differen
> perception of the given problem statements should be covered in depth

**The finding that mattered most.** Re-reading the Situation section rather than the
Minimum Requirements: graduates *"should be able to confidently explain the systems they
built"*, and *"effectively communicating this knowledge remains one of the biggest
challenges."* The product is interview **preparation**, not examination — but all four
scoring axes measured knowledge. The system addressed half its own brief.

Added `communication` as a fifth axis, reported beside knowledge and never averaged into
it. Its mirror of the bluffing flag is `undersells`: high knowledge, low delivery — the
exact population the brief describes.

**That fix failed on the first attempt, and the failure is the interesting part.** Scored
directly, a rambling answer containing the right facts came out `1/1/1` — *identical to a
confidently wrong answer*. Delivery was dragging the knowledge scores down, collapsing the
one distinction the axis exists to draw. Strengthening the prompt wording did not fix it.
What did: a `claims` field the model must fill first, listing each technical claim with the
filler stripped, after which knowledge is scored from that list alone.

| Answer | knowledge | communication |
|---|---|---|
| clear and correct | 3.3 | 4 |
| same facts, rambling | 1.7 | 1 |
| confident but wrong | 0.3 | 2 |
| precise facts, bad delivery | **3.7** | **2** → `undersells` |

**Other perspectives taken, each finding something:**

- *"Assess the concepts they have completed."* Audit found 4/20 candidates asked about days
  their record never mentions — an unknown SHIP_IT day scored 30+12 against a mastered
  SETUP day's 55−25, and a module rule discarded deferred days so an unrecorded one took
  the slot. Rebuilt as four explicit passes. **0/160 questions** now target an unrecorded
  day, asserted.
- *"Resemble a real technical interview rather than a scripted questionnaire."* Live, a
  candidate asking *"do you mean the retrieval step or the embedding step?"* had its own
  question re-asked verbatim, and an honest *"I don't remember"* was pressed with a
  rephrasing. Turns now classify intent — clarify is unscored and does not consume the
  slot, concede advances without pressing.
- *The seven headline topics.* MCP appears in only 3/20 plans because only 3 candidates have
  Day 23 recorded. Correct, but indistinguishable from failing it. The report now names
  what was not assessed and why.
- *Hostile input.* Ten malformed profiles and twelve malformed requests. Found: a mission
  citing a day outside the curriculum raised `KeyError` at the endpoint; `name`/`jobRole`
  flow into the prompt so **injection via the profile** was possible, not just via the
  answer; an all-skipped record 500'd on a 3-module target that is ours rather than the
  brief's; `sessionId` was unbounded.

**Two bugs introduced by my own fixes, caught by testing them rather than assuming:**
concede advanced the slot while the model's reply still probed the old topic — state and
words disagreed, so the rule moved into the prompt; and a per-slot clarification budget let
a purely-clarifying candidate run to the turn cap, so it became per-session.

**Verified:** 8 personas pass, 20/20 candidates, secrets clean on 44 files, `next build`
clean. Live end to end, the report's first next-step was *"Rehearse starting every answer by
restating the specific question asked"* — genuine interview coaching rather than grading.

---

### [10] 2026-08-09 — Live-testing the UI, not just building it
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim):**
> now i think we should focus on the ui/ux as this is also included in that last point,
> so now lets focus on the ui and for that i believe you already have 21st.dev and
> additionally also enable the react bits mcp [...] proceed in the direction which is
> correct and best and start implementation one by one according to the priority

**What happened.** Rather than trust `next build`, drove a full interview through the real
browser (Chrome, via the claude-in-chrome MCP tools) end to end. Found a genuine bug this
way that no amount of code review would have caught: `build_plan()`'s pass-1/2/3 dedup
logic tracked `per_day` (the day actually asked) but checked it against `sig.day` (the
original day) — for a skipped day bridged elsewhere, those differ, so the same skipped
signal survived into the next pass and got bridged a second time. Live: candidate CAND-001
was asked the identical "Capstone Project" framing twice, burning the 8th slot on a repeat
instead of a fresh topic.

Also found live: `prefers-reduced-motion` was wired into `globals.css` but every animation
in the app is a Framer Motion component, which never reads that media query — the CSS fix
did nothing. And the README's own `--all` example output was stale (predated a feature
added earlier the same day), so a judge running the command verbatim would see different
output than documented.

**Produced:** `app/planner.py` (`planned_signal_days` tracking, pass-3 exclusion of
`skipped` signals), `eval/run_eval.py` (permanent duplicate-slot assertion), `web/app/
layout.tsx` (`MotionConfig reducedMotion="user"`), `README.md` (regenerated example output).

**Kept:** all three fixes, plus the duplicate-slot assertion as a standing regression
guard — verified 0 duplicates across all 20 seed candidates after the fix.

**Commit:** `2a8cd21`, `17fb673`, `af43ca0`

---

### [11] 2026-08-09 — Surfacing adaptivity in the flow, not just the report
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

Continuation of the same UI-focus session. The judging notes call out "creativity in
interview flow, reasoning, and interaction design" specifically — the plan panel already
showed the agent's reasoning *before* a question, but the transcript gave no signal that a
follow-up was a deliberate second probe rather than just the next question.

**What was checked before building it:** whether a follow-up is derivable client-side from
`meta.currentSlot` (it only advances on a real question change) — yes, so no backend
change and no score/verdict crosses the wire. That mattered because `SCORING_GUIDE` has a
deliberate rule that bluff/undersell detection must never surface mid-interview, only in
the final report; this only shows *that* the agent chose to dig deeper, never *why*, so
that rule stays intact.

**Produced:** `web/app/page.tsx` (slot-tracking ref), `web/components/Transcript.tsx`
("digging deeper" tag).

**Verified live:** a vague answer on Day 7 drew a follow-up tagged "digging deeper" with a
left accent border, distinct from a fresh question, no score visible.

**Commit:** `bce4c6c`

---

### [12] 2026-08-09 — Premium UI pass: fonts, motion, cards
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim, the first ask for this):**
> now i think we should focus on the ui/ux [...] I want to give the user most premuim
> experience as possible with mind blowing components, animations, transitions, card
> structures, theme (like claude very aesthetic and premium with animated icons and button
> theme [...]) [...] create a plan to meet this objective and implement that plan in tasks.

**The font decision.** Asked to extract fonts from a specific GitHub repo
(`slantie/qubits-learnova`). Checked before using: the two font families in that repo
(Matter, SeasonMix) are commercial webfonts — PangramPangram's own FAQ states their free
tier is personal-use-only, commercial license required; the referenced repo has no LICENSE
file, granting no redistribution rights regardless of what its author personally licensed.
Declined to copy the files into a public hackathon repo on that basis. Substituted
Instrument Sans + Fraunces (`next/font/google`, both OFL) — same structural pairing
(geometric sans + editorial serif) as Claude's own marketing site, verified live.

**Produced:** `web/app/layout.tsx` (font pairing, `MotionConfig`), `web/app/globals.css`,
`web/components/Transcript.tsx` (spark-glyph thinking indicator, blur-reveal), `web/
components/Composer.tsx`, `web/components/Report.tsx`, `web/components/CandidatePicker.tsx`
(icon + motion pass on every button and card).

**A bug caught before shipping:** a card's left accent bar was built as an inset
`box-shadow` with an X-offset and no blur/spread, which paints a thin ring around all four
sides rather than one — confirmed live via screenshot, replaced with a real positioned
element.

**Commit:** `485a044`

---

### [13] 2026-08-09 — Theme toggle and a React Bits component
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim):**
> now i have restarted the claude and have rotated three api keys each with different
> organizations and continue toward making this software as premium for user as possible

React Bits MCP connected mid-session (`/mcp` reconnect). Searched its registry rather than
building from scratch; declined most of it (BlobCursor, MetaBalls, ImageTrail — cursor and
particle effects that would clash with the restrained aesthetic already built) and pulled
exactly one component, `CountUp`, for the report's headline score reveal.

**Two bugs found live, both before committing:** the theme toggle read only the explicit
`data-theme` attribute to pick its icon, but `globals.css` falls back to
`prefers-color-scheme` when that attribute is absent — on a system already in dark mode,
the toggle showed the wrong icon for the actual rendered theme. And `CountUp`'s
decimal-place inference used `n.toString()`, which drops to zero decimals for any whole
number (`(0).toString()` is `"0"`, not `"0.0"`) — a score of exactly 0 rendered as a bare
`0` instead of `0.0`, inconsistent with every other score on the page.

**Produced:** `web/components/ThemeToggle.tsx`, `web/components/CountUp.tsx`,
`web/app/layout.tsx` (`suppressHydrationWarning` for the theme-init script's intentional
hydration mismatch).

**Commit:** `9cf542f`

---

### [14] 2026-08-09 — Gap analysis against the actual reference sites
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim):**
> now i think we should focus on the ui/ux [...] i want you to reconsider the above prompt
> and analyze it in depth as possible and list the requirements and the changes and their
> reference that are asked [...] now rectify all your mistakes by first analyze create
> tasks to achieve but this time correctly

Loaded `claude.com/claude-for-chrome` and `claude.ai` live in Chrome (not `WebFetch`, which
only sees static markup and can't show real hover/motion state) to check the actual
reference rather than work from memory. Confirmed most of the aesthetic was already
aligned; found three real, small gaps. Deliberately did not clone claude.ai's sidebar nav
(Chats/Projects/Artifacts) — this product has no chat history or multi-project concept, so
that nav would be empty chrome with nothing behind it.

**Produced:** `web/components/CoveragePanel.tsx` (sidebar footer — built as the
*interviewer's* identity, not the candidate's, since candidate identity already sits in
the main header and repeating it would be redundant), `web/components/Composer.tsx` +
`web/components/CandidatePicker.tsx` (icon pass on the last plain-text elements).

**Commit:** `d4cb650`

---

### [15] 2026-08-09 — Redis-backed sessions for serverless
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim):**
> i want to deploy both on the vercel as i have verified it is taking 3-5 sec to answer
> [...] now what to do next do we need domain also

Flagged before deploying: sessions lived in an in-process dict (`app/store.py`), correct
for one long-running container but not for serverless, where each request can land on a
different, memory-isolated instance — a second turn could 404 with "Unknown sessionId" not
because it's slow, because the memory genuinely isn't there. Offered three options; chose
to fix it properly rather than accept the risk or fall back to Render alone.

**Produced:** `app/store.py` (pluggable in-memory / Upstash Redis backend), `app/
interviewer.py` (`Session.to_dict`/`from_dict`), `app/main.py` (lock moved from the Session
object to the store, keyed by session id — a Redis-backed store hands back a fresh object
per request, so there's no single instance to hold a `threading.Lock` on),
`eval/run_eval.py` (concurrency test updated to match).

**Verified before wiring in:** the `to_dict`/`from_dict` round-trip directly, offline, plus
real client method signatures (`upstash_redis.Redis.set/get/delete/dbsize`) checked against
the installed package rather than assumed.

**Commit:** `302a402`

---

### [16] 2026-08-09 — The Vercel deploy actually failed, and why
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim, across the debugging thread):**
> this is the url https://Jenish-ab-talks.vercel.app but it is not working [...] can you
> figure out why

Backend returned FastAPI's own `{"detail":"Not Found"}` for every path tested — `/`,
`/health`, `/api/candidates` alike, byte-identical. That ruled out a code crash (nothing
in the app hard-requires an env var without a default) and pointed at routing. Built the
original deploy against an older Vercel Python pattern (`api/index.py` + a
rewrite-everything `vercel.json`); fetched Vercel's own docs live (dated 2026-07-22, not
from memory) and found their current approach auto-detects a FastAPI `app` directly at
conventional filenames, including `app/main.py` — which this repo already had. The custom
entry point was fighting that auto-detection, not enabling it.

**Produced:** deleted `api/index.py`; `vercel.json` replaced the rewrite with
`functions.maxDuration` (also directly relevant — scoring calls run several seconds and can
hit both a Groq attempt and an NVIDIA fallback in one request).

A second, separate issue surfaced after the routing fix: CORS rejected the frontend's
preflight because `CORS_ORIGINS` had been set to a specific origin that didn't exactly
match. Fixed by reverting to `*` — the documented default, since the API has no auth and no
cookies, and Vercel gives one project several valid origins (production, git-branch alias,
per-deployment hash) that a single restricted value can't match anyway.

**Commit:** `15763c6`

---

### [17] 2026-08-09 — README restructure
**Author:** Jenish · **Tool:** Claude Code (Opus 5)

**Prompt (verbatim):**
> now can you update the prompt.md as i have to give the link of it make it properly
> structured and organized and updated [...] i want you go to
> "https://github.com/ridh21/RideBuddy" i want that exact readme file structure at the root

Fetched the referenced repo's README via the GitHub API for exact structure (banner table,
shield badges, anchored table of contents, emoji section headers, tables, horizontal
rules) rather than eyeballing a summary. Rebuilt this repo's README into that structural
pattern with this project's own content — no prose or project description copied from the
reference, structure and formatting convention only.

**Produced:** `README.md` (full restructure).

**Commit:** `efdc51f`
