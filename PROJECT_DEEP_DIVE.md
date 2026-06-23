# Synthesis — Project Deep Dive

A tour of how Synthesis actually works: the architecture, the data flow, the folder layout, and the
parts that were genuinely hard. If the README is the "what," this is the "how" and the "why."

---

## 1. The one-sentence version

A planner decomposes a question into sub-questions; a pool of researchers chases each one down in
parallel (search → fetch → chunk → embed → retrieve); a synthesizer writes a cited report; and a
critic verifies every claim against its sources and sends weak ones back for revision — with the
whole orchestration streamed to a live "control room" UI over Server-Sent Events.

Everything lives in **one TypeScript codebase** (Next.js App Router). Every external dependency has
an offline fallback, so the entire multi-agent pipeline runs with no API keys and no containers.

---

## 2. Architecture at a glance

```
                          POST /api/run  { question }
   ┌──────────────┐  ───────────────────────────────▶  ┌───────────────────────────┐
   │  Next.js UI  │                                     │   Research graph (run.ts) │
   │ control room │  ◀── SSE: RunEvent frames ────────  │                           │
   └──────────────┘                                     │   Planner                 │
          ▲                                             │     │ fan-out              │
          │ projects state                              │     ▼                      │
          │ from the event                              │   Researcher × k  (parallel)│
          │ stream                                      │     │ search·fetch·embed   │
          │                                             │     ▼                      │
          │                                             │   Synthesizer ⇄ Critic     │
          │                                             │     └ bounded revise loop  │
          │                                             └───────────┬───────────────┘
          │                                  emits RunEvents onto    │
          │                                  a concurrent event bus  ▼
          │                                            ┌───────────────────────────┐
          └────────────── one consumer ◀────────────── │  bus.ts  (MP / SC queue)  │
                                                        └───────────────────────────┘
   tools ── SearXNG · fetch_page · embeddings · vector store (pgvector | in-memory) · run store
            (each with a zero-infra offline fallback)             also exposed over MCP (mcp/server.ts)
```

The key idea: **the UI is a pure projection of the event stream.** The agents don't know about React;
they emit typed `RunEvent`s. The SSE route drains them; the client reducer folds them into view state.
That separation is what makes the live visualization trustworthy — it's showing you exactly what the
graph emitted, in order.

---

## 3. Data flow, end to end

1. **Request.** The client POSTs `{ question }` to [`/api/run`](src/app/api/run/route.ts). The route
   opens an SSE response and starts the graph.
2. **Plan.** The [planner](src/lib/agents/planner.ts) turns the question into 3–5 sub-questions and
   emits a `plan` event. The UI renders the plan strip.
3. **Research (parallel).** [`run.ts`](src/lib/graph/run.ts) spawns one
   [researcher](src/lib/agents/researcher.ts) per sub-question. Each one: calls `search` (SearXNG),
   `fetch_page`s the top hits, chunks + embeds the text, retrieves the most relevant passages, and
   registers globally-numbered sources. Every tool call is a `tool_call` event; every new source is a
   `source` event. Researchers stream **concurrently**, each onto its own lane.
4. **Synthesize.** The [synthesizer](src/lib/agents/synthesizer.ts) writes a Markdown report grounded
   in the retrieved passages, emitting `token` events as it streams. Inline `[n]` markers reference
   the registered sources.
5. **Critique.** The [critic](src/lib/agents/critic.ts) extracts the report's claims, checks each
   against the passages it cites, labels confidence (`supported` / `single-source` / `disputed`), and
   — if too many are weak — triggers a **bounded** revise loop back to the synthesizer.
6. **Persist & finish.** The completed run is written to the [run store](src/lib/runs/store.ts) for a
   shareable `/run/<id>` URL, a `usage` event reports tokens + cost, and `run_done` closes the stream.

The wire protocol is a single discriminated union: [`RunEvent`](src/lib/events.ts). Every frame is
`{ type, ... }`, lane-addressed where relevant, so the client reducer is a tidy `switch`.

---

## 4. Folder structure

```
src/
  app/
    page.tsx                 # control room (home)
    about/                   # who built it + contact
    about-project/           # why it exists, build story, decisions, stack
    run/[id]/page.tsx        # read-only shareable run
    api/run/route.ts         # SSE endpoint that drives the graph
    layout.tsx               # fonts, metadata, OG/Twitter
    globals.css              # design tokens (@theme) + a11y/animation primitives
    opengraph-image.tsx      # generated 1200×630 social card
    icon.svg                 # favicon (agent-graph glyph)
  components/
    ControlRoom.tsx          # client: fetch SSE, reduce events → view state
    PlanStrip / LaneGrid / ToolCallFeed
    RunReport / Report / ClaimLedger / KnowledgeGraph / SourceList / ReportToolbar
    SiteHeader / SiteFooter / PageShell   # shared chrome + nav
    about/                   # ContactCard, ContactForm, icons, ui primitives
  lib/
    site.ts                  # single source of truth for identity + links
    events.ts                # RunEvent union (the wire protocol)
    graph/{run,bus,usage}.ts # orchestrator, event bus, cost metering
    agents/{planner,researcher,synthesizer,critic}.ts
    tools/{search,fetch}.ts  # SearXNG + page fetch (with offline fallbacks)
    llm/{index,google,mock,types}.ts      # provider-agnostic LLM adapter
    research/{citations,registry,types}.ts# claim extraction + citation integrity
    runs/store.ts            # run persistence (file or Postgres)
    embeddings.ts store.ts   # embeddings + vector store (Gemini | hashed / pg | memory)
mcp/server.ts                # MCP server exposing web_search + fetch_page
tests/research.test.ts       # vitest: text, chunking, citations, search parsing
```

---

## 5. The genuinely hard parts

### 5.1 A concurrent event bus, not a request/response chain
Multiple researchers run at once, each producing events, but SSE is a single ordered stream. The
[bus](src/lib/graph/bus.ts) is a **many-producer / single-consumer** async queue: producers push
`RunEvent`s from independent async tasks; the SSE route awaits a single async iterator and serializes
frames in arrival order. This is what lets parallel lanes update live without races, and it keeps the
UI a faithful mirror of the graph. Getting ordering and completion (knowing when *all* producers are
done) correct under load was the single biggest time sink.

### 5.2 Citation integrity as a first-class check
A model will happily write `[3]` after any sentence. [`citations.ts`](src/lib/research/citations.ts)
extracts claims and the citations attached to them, then the critic re-reads each claim against the
*actual* text of the cited passages. Dangling citations (an `[n]` with no matching source) are
detected and surfaced in the UI (rendered in the "disputed" colour). Confidence labels fall out of
this verification, not out of the model's self-assessment.

### 5.3 Offline-first, with clean seams
Each capability is an interface with two implementations: real and mock.

| Capability | Real | Offline fallback |
|---|---|---|
| LLM (all agents) | Google Gemini | mock provider that plays every role |
| Search | SearXNG | curated real-URL fixtures |
| Embeddings | Gemini `text-embedding-004` | hashed bag-of-words vectors |
| Vector store | Postgres + pgvector | in-process cosine store |
| Run history | file store / Postgres | file store |

The selection happens at the adapter boundary based on env (`GOOGLE_API_KEY`, `SEARXNG_URL`,
`DATABASE_URL`). Because the agents only ever see the interface, the offline mode isn't a toy path —
it's the same orchestration with different leaves.

### 5.4 Streaming UX
Tokens streaming in is the easy part. The design work was deciding *what a person watches* while five
agents work in parallel: a plan strip for shape, a lane per agent for activity, and a single report
that types itself with a blinking caret for the payoff. Reduced-motion is respected throughout.

---

## 6. Tradeoffs I'd flag in a review

- **SSE over WebSockets.** One-way streaming is all this needs; SSE avoids a stateful socket server
  and works through proxies. The cost: no client→server mid-run messaging (so "stop" is a client-side
  `AbortController`, not a server signal).
- **A lightweight Markdown subset** in [`Report.tsx`](src/components/Report.tsx) instead of a full
  parser — enough for headings, lists, emphasis, code, and citation chips, with zero dependencies. A
  real product would swap in a hardened renderer.
- **Bounded revise loop.** The critic can send the report back, but only a fixed number of times, to
  cap cost and latency. Quality vs. spend is a dial, not a guarantee.
- **In-memory vector store as default.** Great for demos and tests; pgvector is the path to anything
  that must survive a restart or scale past one process.

---

## 7. Where to start reading

If you have ten minutes: [`events.ts`](src/lib/events.ts) (the protocol) →
[`run.ts`](src/lib/graph/run.ts) (the orchestration) → [`bus.ts`](src/lib/graph/bus.ts) (the
concurrency) → [`ControlRoom.tsx`](src/components/ControlRoom.tsx) (how the UI consumes it). Those
four files are the spine of the whole thing.
