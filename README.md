# Synthesis

**An autonomous multi-agent research engine with a live "agent control room."**

Ask any real question. Watch a team of AI agents _plan → search → read → cross-check → synthesize_
a fully cited, interactive report — live. The product **is** the visualization of the agent graph:
you see tool calls land, sources get numbered, and a report assembles itself with inline citations.

> **Status: P1 — Tools.** A Researcher agent searches the web (SearXNG), fetches and extracts pages,
> embeds passages into a vector store, and retrieves the most relevant ones. A Synthesizer then
> writes a Markdown report where **every claim cites a numbered source**. Runs fully offline against
> curated real-URL fixtures with **zero infrastructure**; point it at real services to go live.

---

## Architecture

```
┌──────────────┐   question (POST)   ┌─────────────────────────────────────┐
│  Next.js UI  │ ──────────────────▶ │     Research graph (async gen)      │
│ control room │                     │  ┌────────┐  ┌──────────────────┐   │
│   + report   │ ◀──── SSE stream ── │  │Planner │─▶│ Researcher pool  │   │
└──────────────┘   RunEvent frames   │  └ (P2) ──┘  │  search·fetch    │   │
                                     │       │      │  embed·retrieve  │   │
                                     │       ▼      └────────┬─────────┘   │
                                     │  ┌──────────┐   ┌───────────┐       │
                                     │  │Synthesizer│◀─│  Critic   │──┐    │
                                     │  │ (cites)   │  │  (P4)     │  │    │
                                     │  └──────────┘   └───────────┘  │    │
                                     │        ▲────── revise loop ────┘    │
                                     └───────────────┬─────────────────────┘
                                       tools ────────┤
                              ┌──────────────────────▼──────────────────┐
                              │ SearXNG · fetch_page · embeddings        │
                              │ vector store (pgvector | in-memory)      │
                              └──────────────────────────────────────────┘
```

Everything runs in **one TypeScript codebase** (Next.js App Router). The agent graph is a
hand-rolled `async function*` that **yields typed `RunEvent`s**; the SSE route pipes them straight
to the browser. Going from one researcher to the full planner/parallel/critic graph means yielding
more of the same events — the transport and UI never change.

Every external dependency has an **offline fallback**, so the whole pipeline is runnable and
demoable with no keys and no containers:

| Capability | Real | Offline fallback |
|---|---|---|
| LLM | Google Gemini | mock provider (citation-aware) |
| Search | SearXNG | curated real-URL fixtures |
| Embeddings | Gemini `text-embedding-004` | hashed bag-of-words vectors |
| Vector store | Postgres + pgvector | in-process cosine store |

### Key modules

| Path | Role |
|---|---|
| [src/lib/graph/run.ts](src/lib/graph/run.ts) | The research graph: Researcher (search→fetch→embed→retrieve) → citing Synthesizer |
| [src/lib/tools/search.ts](src/lib/tools/search.ts) | SearXNG client + mock fixtures (`getSearchProvider`) |
| [src/lib/tools/fetch.ts](src/lib/tools/fetch.ts) | `fetch_page` with HTML→text extraction + page cache |
| [src/lib/embeddings.ts](src/lib/embeddings.ts) | Gemini + mock embedding providers |
| [src/lib/store.ts](src/lib/store.ts) | `VectorStore`: pgvector + in-memory implementations |
| [src/lib/research/citations.ts](src/lib/research/citations.ts) | Citation extraction + integrity check (the critic's seed) |
| [src/lib/events.ts](src/lib/events.ts) | `RunEvent` union — the wire protocol between graph and UI |
| [src/lib/llm/](src/lib/llm/) | Provider-agnostic streaming LLM adapter |
| [src/app/api/run/route.ts](src/app/api/run/route.ts) | SSE endpoint: validates input, streams `RunEvent` frames |
| [src/components/QuestionConsole.tsx](src/components/QuestionConsole.tsx) | The control room — lanes, tool-call feed, cited report |

---

## Run it

### Offline (no keys, no containers)

```bash
npm install
npm run dev          # http://localhost:3000
```

Synthesis auto-falls back to mock LLM + fixture search + in-memory store, so a run streams the full
search → fetch → cite pipeline immediately.

### Live (real search + reasoning + pgvector)

```bash
docker compose up -d           # SearXNG (:8080) + Postgres/pgvector (:5432)
cp .env.local.example .env.local
```

Then fill in `.env.local`:

```
GOOGLE_API_KEY=your_key_here          # https://aistudio.google.com/apikey
SEARXNG_URL=http://localhost:8080
DATABASE_URL=postgresql://synthesis:synthesis@localhost:5432/synthesis
```

Each capability turns "real" independently as you set its variable — you can, e.g., use real Gemini
while keeping the mock search.

### Scripts

| Command | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build + typecheck |
| `npm run test` | Vitest unit tests (text, chunking, citations, search parsing) |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |

---

## How the agents coordinate

- **Researcher** (live) — searches, fetches the top results, chunks + embeds passages into the
  vector store, retrieves the most relevant ones, and emits numbered **sources** + `tool_call`
  events you watch in real time.
- **Synthesizer** (live) — composes a Markdown report grounded in those sources, citing each claim
  inline as `[n]`. Dangling citations are detected by the integrity check.
- **Planner** (P2) — will decompose the question into sub-questions fanned out to parallel researchers.
- **Critic** (P4) — will verify each claim against its cited passage, label confidence
  (`supported` / `single-source` / `disputed`), and send weak claims back for more research.

Tiered models keep it cost-aware: a fast model for researchers, a stronger model for synthesizer/critic.

---

## Roadmap

- [x] **P0 — Skeleton.** Next.js app + streaming single-agent answer over SSE.
- [x] **P1 — Tools.** `search` (SearXNG), `fetch_page`, `embed + retrieve`; a report that cites real URLs.
- [ ] **P2 — Graph.** Planner + parallel Researchers + Synthesizer as a real state graph.
- [ ] **P3 — Control room.** Lanes per agent, event timeline, richer live tool-call cards.
- [ ] **P4 — Critic loop.** Claim verification + confidence labels + bounded revise loop.
- [ ] **P5 — Report + graph.** Interactive report, inline citations, knowledge graph, shareable URLs.
- [ ] **P6 — Polish & MCP.** Expose tools as an MCP server, cost/token meter, export, design pass.

---

## Tech

Next.js (App Router) · TypeScript (strict) · Tailwind v4 · Server-Sent Events · Google Gemini
(provider-agnostic adapter) · SearXNG · Postgres + pgvector · Vitest · zod.

Design direction: a warm, dense **mission-ops** aesthetic — Space Grotesk for console chrome,
Newsreader serif for the editorial report body, JetBrains Mono for timestamps/labels, one amber
accent for the active agent, and a semantic palette for claim confidence. Motion is purposeful and
respects `prefers-reduced-motion`.
