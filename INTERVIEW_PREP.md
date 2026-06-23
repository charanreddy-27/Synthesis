# Synthesis — Interview Prep

Rehearse from this. It's written to be said out loud, not read off a slide.

---

## The 30-second elevator pitch

> "Synthesis is an autonomous research engine. You ask a hard question, and instead of one model
> guessing, a team of agents plans it out, researches sub-questions in parallel, writes a cited
> report, and then a separate critic verifies every claim against its sources and flags the weak
> ones. The whole thing streams live, so you watch the agents work — and you never have to take the
> answer on faith. It's one TypeScript codebase, and it runs end-to-end with no API keys because
> every dependency has an offline fallback."

---

## The 2-minute walkthrough

> "The problem I started with: every AI answer engine is confidently wrong some of the time, and you
> can't tell which time. I wanted to *see the work*.
>
> So Synthesis is built as a multi-agent graph. A **planner** breaks the question into three to five
> sub-questions. Then a pool of **researchers** runs in parallel — one per sub-question — and each
> does a real research loop: search the web through SearXNG, fetch the pages, chunk and embed them,
> and retrieve the most relevant passages, registering each source with a global citation number. A
> **synthesizer** writes the report grounded in those passages, with inline `[n]` citations. And then
> a **critic** re-reads every claim against the passages it actually cites, labels each one supported,
> single-source, or disputed, and if too many are weak it sends the report back for a bounded revision.
>
> The interesting engineering is the concurrency. All those agents emit events, but the browser gets
> one ordered stream over SSE. So underneath there's a many-producer, single-consumer event bus: the
> agents push typed events, the SSE route drains them in order, and the React UI is just a projection
> of that stream. That's why the live 'control room' is trustworthy — it's literally showing you what
> the graph emitted.
>
> The other thing I'm proud of is that it's offline-first. The LLM, search, embeddings, vector store,
> and run history each have a real implementation and a zero-infra mock, chosen at the adapter
> boundary by environment variables. So you can clone it and run the whole multi-agent pipeline with
> no keys and no Docker — and the agents never know the difference, because they only see interfaces.
>
> Stack is Next.js App Router, TypeScript strict with zod-validated agent I/O, Tailwind v4, Gemini
> behind a provider-agnostic adapter, Postgres/pgvector for retrieval, and an MCP server that exposes
> the same tools to other agents."

---

## STAR stories

### STAR 1 — Parallel agents over a single ordered stream

- **Situation.** I wanted multiple researchers working at once, but the UI receives a single SSE
  stream. Naively interleaving their output produced out-of-order frames and lanes that stepped on
  each other; one slow `fetch` could stall everything.
- **Task.** Let N agents produce events concurrently while the client still receives a clean, ordered,
  per-lane stream — and know reliably when *all* of them were finished.
- **Action.** I built a many-producer / single-consumer async event bus. Producers push typed
  `RunEvent`s from independent tasks; the SSE route consumes a single async iterator and serializes
  frames in arrival order. Events are lane-addressed, so the client reducer routes each one to the
  right agent's lane. Completion is tracked so the stream closes only after the last producer drains.
- **Result.** Parallel research with a live, race-free visualization. I rewrote the bus a few times
  before the ordering and completion logic held under load — and that bus is now the spine the whole
  app projects from.

### STAR 2 — Making "cited" actually mean something

- **Situation.** Early on, the model would attach citation markers to sentences they didn't support —
  citations as decoration.
- **Task.** Enforce that every claim is actually backed by the passage it cites, and make weak claims
  visible instead of hidden.
- **Action.** I separated *verification* into its own critic agent. A citation-integrity module
  extracts claims and their attached `[n]`s; the critic re-reads each claim against the real text of
  the cited passages and assigns a confidence label. Dangling citations (no matching source) are
  detected and rendered distinctly. If too many claims are weak, a bounded loop sends the report back.
- **Result.** Confidence labels and a critic ledger that come from verification, not the model's
  self-report — plus an evidence graph that lets you trace any claim to its sources.

### STAR 3 — Offline-first so it runs anywhere

- **Situation.** A multi-agent system usually needs API keys, a search backend, a vector DB — friction
  that kills demos and makes tests flaky.
- **Task.** Make the full pipeline runnable with zero infrastructure, without forking the logic into a
  "fake" path.
- **Action.** I put every external capability behind an interface with two implementations — real
  (Gemini, SearXNG, pgvector) and mock (canned LLM, fixture search, hashed embeddings, in-memory
  store) — selected at the boundary by env vars. The agents depend only on the interface.
- **Result.** `npm install && npm run dev` runs the entire graph offline; each capability flips to
  "real" independently when you add its key. Tests run hermetically against the mocks.

---

## Likely technical Q&A

**Q: Why SSE instead of WebSockets?**
Streaming here is one-way (server → client), and SSE gives me that over plain HTTP with auto-reconnect
and no stateful socket server to operate. The tradeoff is no mid-run client→server messaging, so
"stop" is a client-side `AbortController` cancelling the fetch rather than a server-side signal. For
two-way interactive control I'd switch to WebSockets.

**Q: How do you handle one researcher failing or hanging?**
Researchers are independent producers on the bus, so one failing doesn't block the others. Tool calls
have their own status, fetch failures degrade to whatever sources did resolve, and the run can still
synthesize from partial findings. The client also holds an `AbortController` to cancel the whole run.

**Q: How does retrieval work — is this RAG?**
Yes, per-researcher RAG. Each researcher fetches pages, chunks the text, embeds the chunks
(Gemini `text-embedding-004`, or hashed bag-of-words offline), and retrieves top passages by cosine
similarity to the sub-question. The synthesizer is grounded in those retrieved passages, and citations
point at the registered sources.

**Q: What stops the synthesizer from hallucinating citations?**
The critic. It's a separate verification pass that checks each claim against the actual cited text and
labels confidence; dangling citations are flagged. It's deliberately not the same call that wrote the
report — verification you can't trust is just more generation.

**Q: How do you control cost and latency?**
Tiered models — fast/cheap for researchers, stronger for synthesis and critique — a token+USD meter
per run, and a *bounded* revise loop so the critic can't ping-pong forever. There's also a per-run
token cap (`MAX_TOKENS_PER_RUN`).

**Q: How is correctness tested?**
Vitest covers the deterministic core: text utilities, chunking, citation extraction/integrity, and
search-result parsing. Agent I/O is validated at runtime with zod, and TypeScript is strict, so the
schema of every event and tool result is enforced both at compile time and at the boundary.

**Q: Why one codebase / Next.js for an agent system?**
The orchestration is I/O-bound glue, not heavy compute, so it lives comfortably in Next.js server
runtime alongside the UI. One language, one type system across the wire (`RunEvent`), one deploy. If
the graph ever needed to scale independently, the agent layer is already decoupled behind the bus and
the adapters, so lifting it into its own service is mechanical.

**Q: Is it provider-locked to Gemini?**
No — all agents go through an LLM adapter (`llm/index.ts`) with a typed interface. Gemini and a mock
provider implement it today; adding another is one more implementation, no agent changes.

---

## What I'd improve next

- **Swap the Markdown subset for a hardened renderer** and sanitizer — today `Report.tsx` handles a
  deliberate subset with zero dependencies, which is great for control but not for arbitrary output.
- **Server-side run cancellation and resumability** — persist partial run state so a dropped
  connection can reattach instead of restarting.
- **Smarter retrieval** — reranking and dedup across researchers, so two of them fetching the same URL
  don't double-count a source.
- **Eval harness** — a small graded set of questions with expected sources, to measure citation
  precision/recall as I change prompts, instead of eyeballing it.
- **Streaming the critic** — right now verification lands as a batch; streaming it would tighten the
  feedback loop in the UI.

---

## Smart questions to ask the interviewer

- "Where does the team draw the line between trusting model output and verifying it — is there an eval
  culture, or is it mostly vibes-and-ship right now?"
- "When an LLM feature is I/O-bound orchestration like this, how do you decide what stays in the app
  vs. what becomes its own service?"
- "What does 'done' look like for an AI feature here — how do you know it's good enough to ship, and
  who owns that call?"
- "What's the most surprising way an agent/LLM system has broken in production for you, and what did
  you change because of it?"
- "How much of the work is prompt/agent design vs. the systems engineering around it? I find the
  second part is where most of the real difficulty lives — curious if that matches your experience."
