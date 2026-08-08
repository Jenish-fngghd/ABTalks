# TASK: Deep research + architecture spec for "The Interview Agent" (ABTalks Hackathon)

You are acting as principal engineer + research lead. Output is a **specification document**, not an implementation. Do not write application code unless a snippet is the clearest way to express a contract or schema.

Honesty rules apply to this entire document and override everything below:
- Never invent a URL, repo name, star count, release date, model name, paper, benchmark number, or pricing figure.
- Every factual claim about an external project, model, paper, or platform carries a link.
- Anything you could not verify with a fetch/search is tagged `UNVERIFIED` and kept out of load-bearing decisions.
- If a source contradicts your prior belief, the source wins; note the correction in one line.

---

## 0. Load context first

Read these before anything else. Do not assume contents.
- `./curriculum.json` — 31-day AI cohort curriculum (modules, daily topics, learning objectives, tools)
- `./candidates/*.json` — candidate profiles (completed missions, attempts, skipped topics, learning signals)
- `./technical-spec.*` — REQUIRED API contract, request/response formats, submission requirements

Quote the required endpoint signature and request/response JSON **verbatim** in your output. **The API contract is non-negotiable and drives the architecture.** Where the spec is ambiguous, list the ambiguity and the reading you chose. If a file is missing, list what's missing and proceed with the rest — do not stall.

### 0a. Submission form — the exact fields being collected

The submission form takes a problem-statement tab plus **three URLs, and nothing else**. Every design decision must terminate in one of these three:

| Field | Constraint (form's own wording) |
|---|---|
| Public GitHub repo link | *"Your full project source, public and cloneable. Private repos won't be judged."* |
| Live URL | *"Something we can open — Vercel, Netlify, or any reachable host. A README-only demo doesn't count."* |
| AI-usage log URL | *"A PROMPTS.md in the repo, or exported chat transcripts. This is how we verify the build was genuinely vibe-coded."* Placeholder shown: `https://github.com/<user>/<project>/blob/main/PROMPTS.md` |

Notes that follow from this:
- Submissions are editable until the deadline; each save replaces the last. So submit a working-but-partial version early and keep replacing it — never leave the form empty until deadline day.
- Three URLs means **no demo video, no slide deck, no write-up field**. The README and the live demo carry the entire narrative. Weight them accordingly.
- Submit under the correct problem-statement tab. The form has three; picking the wrong tab invalidates the entry.
- The repo must be **public and cloneable** — verify in a logged-out browser, not from your own account.

---

## 1. Problem analysis (do this before any research)

Two pages max, written as if briefing a skeptical judge:
1. Restate the problem in your own words. What is actually being graded — the interview *questions*, or the *interviewer's judgment*?
2. Decompose into capabilities: profile → plan, plan → question, answer → assessment, assessment → next action, session → report. For each, state what "good" looks like and how it could be measured.
3. **Hard requirements checklist**, each with the mechanism that guarantees it (not the prompt that hopes for it):
   - Conversational multi-turn interview
   - ≥8 questions covering ≥4 distinct curriculum days
   - Follow-ups derived from prior answers
   - Context maintained across the whole interview
   - Structured feedback at the end
   - The specified HTTP endpoint exposed
4. **Reverse-engineer the rubric.** Judging is 2 independent judges, 100 points. If the published rubric is available, quote it and map every design decision to the criterion it earns points under. If not available, infer the likely axes (requirement compliance, technical depth, UX, creativity, code quality, demo) and design against them explicitly. State which axis each major decision targets.
5. **Where teams will converge.** Predict the median submission (thin wrapper over one LLM call loop, generic feedback, template chat UI). Name the 3 specific things that will make this submission visibly different — and make sure §4 and §5 actually deliver them.

Out of scope, do not design: voice, auth, persistent accounts, long-term history, mobile apps.

---

## 2. Research — open source projects (MANDATORY SOURCING)

Search GitHub, Hugging Face, and the web. Categories:
1. AI interviewer / mock-interview agents ("AI interviewer", "mock interview LLM", "technical interview bot")
2. Multi-turn stateful agent orchestration — LangGraph, PydanticAI, Agno, OpenAI Agents SDK, CrewAI, Mastra, DSPy. Compare **state/checkpointing models specifically** — that is the crux here, not the agent abstraction.
3. Retrieval over structured curriculum data — LlamaIndex, Haystack, and the alternatives in §3.
4. LLM-as-judge / rubric scoring / eval — Ragas, DeepEval, promptfoo, OpenAI evals, LangSmith
5. Streaming chat UIs — Vercel AI SDK, assistant-ui, shadcn chat blocks
6. Adaptive assessment / knowledge tracing implementations (pyBKT, IRT libraries, `catsim`-style adaptive testing)

For **each** project cited, log a row:

| Project | URL | Stars | Last commit | License | What we take | What we reject & why |

Rules:
- Prefer actively maintained (commit within ~6 months) and permissively licensed (MIT/Apache-2.0). Flag AGPL/GPL explicitly as a submission risk.
- From open source, take **file/folder structure and conventions only**. Do not lift application logic wholesale — Stage 2 authenticity review scans for imported codebases. State this constraint in the doc.
- Verify licenses by reading the LICENSE file, not the README badge.

---

## 3. Research — techniques (bias to current best, not familiar default)

### 3a. Retrieval: challenge whether RAG belongs here at all
A 31-day curriculum JSON may fit entirely in a modern context window. **Compute the actual token count of `curriculum.json` and the largest candidate profile and put the number in the doc.** If it fits, say plainly that a vector DB is dead weight and cut it — that is a stronger answer than a bolted-on Chroma instance, and defensible to judges.

Only if the numbers justify retrieval, research and compare (with sources):
- Long-context prompting + prompt caching (Cache-Augmented Generation / CAG)
- Contextual retrieval (chunk-level context prefixing)
- Agentic / iterative retrieval — retrieval as a tool call, not a pipeline stage
- GraphRAG / LightRAG and knowledge-graph approaches over curriculum structure — see §3d, which treats this as a separate decision from retrieval
- Late-interaction retrieval (ColBERT-family) and modern rerankers
- Hybrid BM25 + dense
- Structured/SQL-over-JSON retrieval — often the right answer for well-typed data

Deliver a decision with the runner-up named in one line and why it lost.

### 3b. Inference-time techniques
Research and rule in/out, each with a source and a cost/latency note:
- Structured outputs / constrained decoding / grammar-constrained JSON (vs. parse-and-retry)
- Prompt caching for the static curriculum + system prompt (this is the single biggest cost lever — quantify it)
- Reasoning-effort control on reasoning-capable models: high effort for scoring, low for chit-chat turns
- Speculative decoding, and routing/mixture-of-experts serving strategies
- **Cursor "Mixture of Kittens"** — https://cursor.com/blog/mixture-of-kittens — fetch and read this before referencing it. Summarize what it actually claims in 3 lines. Then judge honestly: it is an inference-serving/MoE-training technique. State plainly whether it applies to an app-layer hackathon project or is out of scope. **Do not include it for flavor.** If it does not apply, say so in one line and move on; if a narrow idea from it (e.g. routing cheap turns to a small model) transfers, take only that and name it.
- Multi-model routing: cheap model for question phrasing, strong model for scoring and final report. Quantify the saving.

### 3c. Papers (2023–2026)
Title, authors, venue/arXiv ID, link, and 2 lines of "what we use from it". Cover at minimum:
- Computerized adaptive testing / item response theory applied to LLM assessment
- Knowledge tracing (DKT / BKT / attention-based KT) — mapping profile signals to per-topic mastery
- LLM-as-a-judge reliability: position bias, verbosity bias, self-preference, calibration
- Multi-turn agent memory, context management, and long-conversation degradation ("lost in the middle" and successors)
- Socratic questioning / tutoring dialogue agents
- Rubric-grounded structured generation
- Prompt injection defense in agent loops (candidate answers are untrusted input)
- Conversational Education at Scale: A Multi-LLM Agent Workflow for Procedural Learning and Pedagogic Quality Assessment (arXiv:2507.05528)
- AI Conversational Interviewing: Transforming Surveys with LLMs as Adaptive Interviewers (arXiv:2410.01824)
- An LLM-Enhanced Multi-agent Architecture for Conversation-Based Assessment
- Evaluating LLM-based Agents for Multi-Turn Conversations: A Survey (arXiv:2503.22458)
- Is Passive Expertise-Based Personalization Enough? A Case Study in AI-Assisted Test-Taking (arXiv:2511.23376)

### 3d. Graph engineering — evaluate seriously, then scope hard

Reference input: *"Agentic Software Engineering Practice 2026 — Graph Engineering: The Karpathy Loop, Improved 1000x by Itself / The Anthropic Playbook"* (`Karpathy-Graph-Engineering-Systems.pdf`, https://drive.google.com/file/d/1-GOg0kxcp8tx1BMUECMj2yJq6JYGmfhb/view).

**Provenance warning — cite this correctly or not at all.** The document states on its own cover: *"Independently compiled, July 2026 — not affiliated with Andrej Karpathy and Anthropic — and not endorsed."* It is a third-party synthesis, **not** a Karpathy or Anthropic publication. If you cite it, cite it as an independent synthesis note. Prefer citing its **primary sources directly** — Karpathy's `autoresearch` and `AgentHub` repos, Anthropic's "Building Effective Agents", Dynamic Workflows, and Knowledge Graph Construction Cookbook. Fetch and verify each primary source; tag `UNVERIFIED` any you cannot reach. Misattributing this to Karpathy in the submission is a credibility hit a judge can catch in one search.

Its core claim, which you should use as an analytical frame: each architecture externalizes a different bottleneck — **a loop externalizes iteration, a chain externalizes task order, a swarm externalizes parallel search, a DAG externalizes experiment lineage, a knowledge graph externalizes shared facts and cross-session memory.** Use this to justify the §5.2 architecture choice: name our actual bottleneck, then pick the architecture that externalizes *that one*.

Now apply it honestly to this project:

**Reject unless the numbers say otherwise — state the rejection explicitly in the doc, with the reason:**
- Agent swarms / 1000-way parallel sub-agents — these externalize parallel experiment search. One candidate, one session, ~8–12 sequential turns. Wrong scale.
- Commit-DAG experiment lineage (AgentHub-style) — externalizes research lineage across hundreds of runs. Not our problem.
- Cross-session memory graph — explicitly out of scope per the problem statement ("long-term conversation history").
- LLM-driven KG *construction* from unstructured text (the Cookbook's main contribution) — our curriculum ships as typed JSON. There is nothing to extract. Do not build an extraction pipeline for data that is already structured.

**Evaluate for real — this is the one that may earn its keep:**
- **Curriculum as a typed prerequisite graph.** Model `Day → Module → Topic → Concept → Tool` with `depends_on` / `builds_on` edges, and overlay candidate state (`completed` / `attempted_n` / `skipped` / `mastery_estimate`) onto the nodes.
- Determine whether the provided `curriculum.json` actually encodes prerequisite relationships, or whether they must be inferred. **If they must be inferred by an LLM, say so and treat the inferred edges as fallible** — show them in the UI, do not hide a hallucinated dependency behind a confident question.
- The payoff to test: does graph traversal produce *better question selection* than a flat list? Concretely — can it support reasoning like *"candidate skipped Day 12; Day 19 depends on it; their Day 19 answer was shallow → the gap is Day 12, probe there"*? Traversal over a small typed graph is not RAG and needs no vector DB; NetworkX or a plain dict of adjacency lists is likely sufficient.
- Also test whether the graph doubles as the **coverage tracker** (§5.2, guaranteeing ≥4 days) and the **feedback map** (§6, gaps rendered against curriculum structure) — one structure serving three needs is the lazy win. If it only serves one, it is probably not worth building.
- **Decide with a number.** If the flat-list baseline picks equally good questions on the eval personas in §5.7, cut the graph and say so. Do not ship it because it demos well.

**Dev-time tooling, not architecture:** Graphify (https://graphify.com/, https://github.com/rhanka/graphify, Apache-2.0, on-device tree-sitter + MCP server) builds a code knowledge graph for coding assistants. It is a tool for *us building the repo*, not a runtime component of the product. Verify its license and current state if adopted, and note it in the AI usage log as tooling. For a repo of this size, default to skipping it — justify in one line either way. Do not present it as part of the system architecture.

---

## 4. Model selection — including open-weight models

**Correction, recorded rather than silently edited:** an earlier version of this section
claimed the sponsor account ("breeth") was a GPU inference platform serving open-weight
models. That was a guess from the name and it was wrong.

**Breeth** (<https://www.thebreeth.com/>) is an *intent-aware memory layer for AI agents* —
a graph of entities and edges where each fact carries `cognitive_pattern` (a behavioural
model such as "risk-averse on stack changes"), `why_connected` (the reasoning behind a
relationship), and `director_vision` (high-level intent). It supports confidence decay and
retraction, and is reached via an MCP server or a REST API. It is **not** a model provider,
so it does not belong in this section's model strategy at all — see §4b.

Model hosting therefore comes from elsewhere (Groq and NVIDIA NIM were used). Deliver a
model strategy that:
1. **Inventories what each provider actually offers** — fetch the live `/models` endpoint and the pricing page. Do not rely on memory. List concrete available model IDs.
2. Evaluates **open-weight candidates** across families — Meta (Llama), Google (Gemma), NVIDIA (Nemotron), Alibaba (Qwen), DeepSeek, Mistral, OpenAI open-weight releases, Microsoft (Phi). For each shortlisted model: parameter count, context window, license (note that some are *open-weight*, not OSI open-source — say so precisely), instruction-following and reasoning benchmark evidence with source, and structured-output reliability.
3. Assigns a model **per role**, with justification:
   - Interviewer turn (latency-critical, conversational)
   - Answer scoring / judging (accuracy-critical, structured output)
   - Final report synthesis (long-context, one call per session)
   - Optional: embeddings, if §3a kept retrieval
4. Names a **primary and a fallback on a different provider**. Free tiers cap tokens per *organization*, not per key, so spare keys from the same account are not a fallback. Say what breaks when the primary is exhausted, cold, or unreachable.
5. Latency + cost table: per turn, per interview, and for the eval suite run.
6. States the "using open models" angle as a judging narrative — a differentiator, but only if it genuinely works. Do not adopt it if it makes the demo fragile; say which you chose and why.

### 4b. Breeth — where an agent memory layer does and does not belong

Given free Pro access, decide honestly rather than adopting it for the sponsor mention.

- **Runtime cross-session memory is explicitly out of scope** ("long-term conversation history"). Do not add it to the product for its own sake.
- **Note the overlap before building anything.** Breeth's `cognitive_pattern` is the same idea as this project's candidate *posture* (`fast-grasp` / `steady` / `persistent-grinder`), and its `why_connected` is the same idea as the planner's per-question `reason`. Both are already derived deterministically from the candidate record in ~40 lines with no network call. Replacing working local logic with a hosted dependency adds a demo failure mode and puts candidate data in a third-party store — say so plainly if you decline.
- **Where it could genuinely earn a place:** memory *about the interviewer*, not the candidate — e.g. which question framings discriminate well across many interviews, decaying as they stop working. That is a real use of confidence decay and retraction, and it is not conversation history. Treat it as optional and additive; it must never sit on the critical path of a live demo.
- **Dev-time use is uncontroversial:** as an MCP server giving the coding assistant memory across sessions. Log it in the AI usage log as tooling, exactly as with any other assistant tool.
- The onboarding card says to claim access and *"run one test write before kickoff — setup time is not build time."* Do that early regardless of the adoption decision.

**Secrets:** API keys never enter the repo. Specify `.env` + `.env.example` + platform env vars, and a pre-commit or CI check for leaked keys. The repo is public — a committed key is both a security incident and a Stage 1 problem.

---

## 5. System design

1. **Architecture diagram** (mermaid): client → endpoint → agent loop → model(s) → response, and where state lives.
2. **The interview agent loop.** Decide and justify:
   - Single-agent-with-tools vs. multi-agent (interviewer / evaluator / planner). Bias toward fewer moving parts; justify any extra agent by what it measurably buys.
   - How the **interview plan** derives from candidate profile + curriculum: how skipped topics, failed attempts, and learning signals change question selection. This is what judges will probe hardest — make it concrete, inspectable, and explainable, not vibes. Consider surfacing the plan in the API/UI as evidence of reasoning.
   - How ≥8 questions across ≥4 days is **guaranteed** by a plan object / state machine, not by prompt wording.
   - Follow-up policy: exact trigger for drilling deeper vs. moving on (score threshold, hedging detected, unverified claim, contradiction with the profile).
   - Difficulty adaptation rule with actual thresholds.
   - The "bluffer" case: candidate uses correct vocabulary with no substance. How does the agent detect and probe it? Handle this explicitly — it is the most impressive thing an interview agent can do.
3. **State model.** Typed session/turn schema. Where it persists (in-memory vs. SQLite vs. Redis) — pick the cheapest that survives a demo redeploy, and state what breaks on process restart.
4. **Context management.** Rolling summary vs. full transcript, token budget per turn, what is pinned (plan, coverage, scores) vs. summarized.
5. **Scoring + final feedback.** Rubric dimensions, per-question scoring, structured output schema (JSON Schema / Pydantic), how hallucinated praise is prevented, how scores map to actionable next steps tied to specific curriculum days. Anti-gaming: candidate instructing the agent to award a perfect score.
6. **Failure modes table**, mitigation per row: off-topic candidate, **prompt injection inside candidate answers**, empty answer, 5k-word answer, invalid JSON from model, unknown session ID, provider timeout, cold start, rate limit, duplicate/concurrent requests on one session.
7. **Eval plan.** N synthetic candidate personas (strong / weak / bluffer / silent / adversarial), one runnable script, assertions on: coverage ≥4 days, ≥8 questions, follow-up rate, score separation between strong and weak personas, feedback references real curriculum days, no crash on adversarial input. This script is also the Stage 2 authenticity evidence and the demo safety net.
8. **API layer.** Exact route(s) from the spec, validation at the trust boundary, error envelope, streaming approach, CORS, and a `/health` endpoint for Stage 1 uptime checks.
9. **Repo structure.** Deliver a **complete, concrete annotated tree** — every directory and every non-obvious file, each with a one-line purpose. Not a sketch, not "and so on". Attribute each convention to the open-source project it came from (§2), but the tree itself must be specific enough to `mkdir` from.

   Requirements the tree must satisfy:
   - **Standard, boring layout for the chosen stack.** Follow the framework's own documented convention (Next.js `app/`, FastAPI `app/` + `routers/`, etc.). A judge should recognize the structure in five seconds. No invented taxonomy.
   - **Domain logic separated from transport.** The agent loop, planner, scorer, and graph must be importable and testable without an HTTP server running — this is what makes the eval script (§5.7) and the Live Steer challenge (§5.11) cheap.
   - Monorepo vs. two repos vs. single full-stack app: pick one, justify in one line. **Submission takes exactly one public GitHub repo URL** — if you split, say how one repo still contains everything judgeable.
   - Every file in the tree must be one somebody will actually create. No placeholder directories "for later".

   Mandatory files, at the paths given:
   - `README.md` (root) — a judged artifact. Must contain: one-paragraph what-it-is, live demo link, architecture diagram, `curl` example hitting the required endpoint in the spec's exact shape, local setup in ≤5 commands, design rationale, and the tech/model choices with why.
   - `PROMPTS.md` (root, on the `main` branch) — the AI-usage log. **The submission form points at `https://github.com/<user>/<project>/blob/main/PROMPTS.md`, so this exact filename at the repo root on `main` is the safe default.** See §5.9a below.
   - `.env.example` — every required variable, with dummy values. Real `.env` gitignored.
   - `LICENSE` — MIT or Apache-2.0.
   - Eval script (§5.7) at a path named in the README, runnable with one command.
   - Demo seed data — a known-good candidate profile so the demo never depends on the judge typing well.

### 5.9a. AI-usage log (`PROMPTS.md`) — logging discipline, in detail

This is a **Stage 1 pass/fail artifact** (must be present and accessible) and the **primary Stage 2 authenticity evidence** (must "reasonably correspond to the implemented features"). The submission form's own words: *"This is how we verify the build was genuinely vibe-coded."* Treat it as a deliverable with the same standing as the code, not as a chore done at 2am on deadline day.

Specify in the doc:
1. **Format.** One append-only entry per meaningful AI interaction, newest last (chronological reads as a build story). Per entry:
   - Timestamp and author (which teammate)
   - Tool/model used (Claude Code, Cursor, etc. — and which model)
   - The **prompt, verbatim** — not a paraphrase, not a summary
   - What it produced: files created/changed
   - What you kept, what you rejected, and what you had to fix by hand
   - Linked commit SHA
2. **The rejection notes are the point.** A log of only successful prompts reads as fabricated. Record the prompts that produced wrong output and what you did instead — that is what a real build looks like, and it is the single hardest thing to fake after the fact.
3. **Coverage rule.** Every non-trivial feature in the repo must be traceable to at least one entry. Conversely, no entry should describe a feature that does not exist. Both directions are checked.
4. **Cadence.** Append at the end of every work session, minimum. Never batch-write the log at the end of the hackathon — the file's own git history is visible, and a single large final commit to `PROMPTS.md` is the exact pattern Stage 2 flags.
5. **Commit hygiene, which is logged evidence too.** Small, frequent, dated commits with real messages, spread across the hackathon window. First commit must be a genuine scaffold, not a finished project. Never force-push over the history. If you use an alternative (exported chat transcripts), commit them into the repo and link them from `PROMPTS.md` so a single URL reaches everything.
6. **Secrets.** Prompts and transcripts routinely contain API keys and paths. Scrub before committing — the repo is public. State a concrete check (pre-commit hook or a grep in CI).
7. Propose the exact entry template as a fenced markdown block in the output doc, ready to paste.

10. **Deployment.** Concrete choice for the live demo URL with the cold-start/uptime tradeoff named. Requirements from the submission form: *"Something we can open — Vercel, Netlify, or any reachable host. A README-only demo doesn't count."* So: publicly reachable with no auth wall, opens to a working interview UI (not a docs page, not a JSON blob), survives a judge opening it days later, and the API endpoint reachable via `curl` in the spec's exact shape. Name the fallback if the primary host fails, and say where the backend lives if the frontend is on Vercel/Netlify (serverless timeout limits are a real constraint for long LLM calls — check the platform's actual limit and design around it).
11. **Live Steer readiness.** Which seams let an unseen feature land in 20 minutes. Name the 3 most likely surprise features (e.g. "add a new scoring dimension", "support a second interview mode", "expose per-question timing") and the exact file each would touch.

---

## 6. UI/UX + motion

MCP servers `21st.dev` and `motion` are enabled — **use them** to source real components and animation primitives, and cite what you pulled from each.

Design two screens:
- **Interview screen:** transcript, streaming answer, input, coverage indicator (which curriculum days covered so far), difficulty cue, question counter against the ≥8 target.
- **Feedback report:** per-dimension scores, strengths, gaps mapped to specific curriculum days, recommended next actions. This is the demo money-shot — treat it as the highest-effort surface in the project.

Requirements:
- Component inventory with states per component (idle / streaming / error / empty / complete)
- Low-fi ASCII wireframe per screen
- Motion: purposeful only. Specify duration, easing, and trigger for token streaming, question transition, coverage update, and score reveal. Honor `prefers-reduced-motion`.
- Accessibility: keyboard-only interview, focus management on new messages, ARIA live region for streaming output, AA contrast in light and dark.
- Theming: tokens defined for light and dark; never define a color only inside a media query.
- Latency UX: what the user sees during a 3-second scoring call. Design for the slow path, not the happy path.

---

## 7. Output format

One markdown document, in this order:
1. Executive summary (≤10 lines) — chosen architecture in plain terms
2. Problem analysis (§1) incl. rubric mapping
3. Verbatim API contract from the technical spec
4. Open-source source log (table)
5. Technique + paper log (§3)
6. Model strategy (§4)
7. System design (§5, all 11 items)
8. UI/UX + motion (§6)
9. Build order — phased task list, each phase independently demoable and committable, with a suggested split for parallel work across the team
10. Risks & open questions

---

## 8. Rules of engagement

- Recommend, don't survey. One choice per decision; runner-up named in one line with why it lost.
- Bias to the simplest thing that satisfies the requirements. If a vector DB, a multi-agent swarm, or a framework is not earning its keep, cut it and say so.
- Novelty must be load-bearing. A technique included because it sounds impressive is a liability in a live demo and under judge questioning.
- Every design decision states which rubric axis it earns points under.
- Flag anything in the technical spec that conflicts with your design and defer to the spec.
