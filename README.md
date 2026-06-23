# Synthesis

**An autonomous multi-agent research engine with a live "agent control room."**

<p>
  <a href="https://synthesis-charan.vercel.app"><strong>▶ Live demo</strong></a> ·
  <a href="./PROJECT_DEEP_DIVE.md">Deep dive</a> ·
  <a href="./DEPLOYMENT.md">Deploy</a> ·
  <a href="https://www.charanreddy.dev">Portfolio</a>
</p>

![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini-8E75B2?logo=googlegemini&logoColor=white)
![MCP](https://img.shields.io/badge/Model_Context_Protocol-server-444)

Ask any real question. Watch a team of AI agents _plan → search → read → cross-check → verify →
synthesize_ a fully cited report — live. The product **is** the visualization of the agent graph:
sub-questions fan out to parallel researchers, tool calls land in real time, a critic flags weak
claims, and a report assembles itself with inline citations, confidence labels, and an evidence graph.

> _**Screenshot / GIF goes here** — drop a recording of a live run into `docs/` and reference it (e.g._
> _`![Synthesis control room](docs/control-room.gif)`). A short clip of the lanes filling in and the_
> _report typing itself is the single highest-leverage thing you can add to this README._

> **Status: complete (P0–P6).** Planner → parallel Researchers → Synthesizer ⇄ Critic, streamed over
> SSE, with a cited report, per-claim confidence, an evidence graph, shareable run URLs, a cost
> meter, Markdown/PDF export, and an MCP server exposing the tools. Runs **fully offline with zero
> infrastructure** (mock LLM + fixture search + in-memory store); point it at real services to go live.

---

## Architecture

```
┌──────────────┐   question (POST)   ┌─────────────────────────────────────┐
│  Next.js UI  │ ──────────────────▶ │     Research graph (event bus)      │
│ control room │                     │  ┌────────┐  ┌──────────────────┐   │
│ lanes·report │ ◀──── SSE stream ── │  │Planner │─▶│ Researcher pool  │   │
│ ·graph·share │   RunEvent frames   │  └────────┘  │ (parallel, N=k)  │   │
└──────────────┘                     │       │      │ search·fetch·embed│  │
                                     │       ▼      └────────┬─────────┘   │
                                     │  ┌──────────┐   ┌───────────┐       │
                                     │  │Synthesizer│◀─▶│  Critic   │      │
                                     │  │ (cites)   │   │ (verifies)│      │
                                     │  └──────────┘   └───────────┘       │
                                     │        └── bounded revise loop ──┘   │
                                     └───────────────┬─────────────────────┘
                                       tools ────────┤        ┌─ MCP server ─┐
                              ┌──────────────────────▼────────▼─────────────┐
                              │ SearXNG · fetch_page · embeddings            │
                              │ vector store (pgvector | in-memory) · runs   │
                              └──────────────────────────────────────────────┘
```

Everything runs in **one TypeScript codebase** (Next.js App Router). Agents emit typed `RunEvent`s
onto a concurrent [event bus](src/lib/graph/bus.ts); the SSE route drains it. Parallel researchers
stream onto their own lanes at the same time. Every external dependency has an **offline fallback**,
so the whole multi-agent pipeline is runnable and demoable with no keys and no containers:

| Capability | Real | Offline fallback |
|---|---|---|
| LLM (all agents) | Google Gemini | mock provider that plays every role (plan/critic/cite) |
| Search | SearXNG | curated real-URL fixtures |
| Embeddings | Gemini `text-embedding-004` | hashed bag-of-words vectors |
| Vector store | Postgres + pgvector | in-process cosine store |
| Run history | file store (or Postgres) | file store |

### The agents

- **Planner** — decomposes the question into 3–5 sub-questions ([planner.ts](src/lib/agents/planner.ts)).
- **Researchers (parallel)** — one per sub-question: search → fetch → chunk → embed → retrieve,
  registering globally-numbered sources ([researcher.ts](src/lib/agents/researcher.ts)).
- **Synthesizer** — writes a cited Markdown report grounded in the findings ([synthesizer.ts](src/lib/agents/synthesizer.ts)).
- **Critic** — verifies each claim against its cited passages, labels confidence
  (`supported` / `single-source` / `disputed`), and triggers a **bounded revise loop**
  ([critic.ts](src/lib/agents/critic.ts)).

### Key modules

| Path | Role |
|---|---|
| [src/lib/graph/run.ts](src/lib/graph/run.ts) | Orchestrator: planner → parallel researchers → synthesizer ⇄ critic |
| [src/lib/graph/bus.ts](src/lib/graph/bus.ts) | Many-producer / single-consumer event bus |
| [src/lib/events.ts](src/lib/events.ts) | `RunEvent` union — lane-oriented wire protocol |
| [src/lib/tools/](src/lib/tools/) · [embeddings.ts](src/lib/embeddings.ts) · [store.ts](src/lib/store.ts) | Tools, embeddings, vector store (each with offline fallback) |
| [src/lib/research/citations.ts](src/lib/research/citations.ts) | Claim extraction + citation-integrity check |
| [src/lib/runs/store.ts](src/lib/runs/store.ts) | Run persistence for shareable URLs |
| [src/components/ControlRoom.tsx](src/components/ControlRoom.tsx) | The control room: plan, lanes, report, ledger, graph |
| [src/app/api/run/route.ts](src/app/api/run/route.ts) | SSE endpoint |
| [src/app/run/[id]/page.tsx](src/app/run/%5Bid%5D/page.tsx) | Read-only shareable run page |
| [mcp/server.ts](mcp/server.ts) | MCP server exposing `web_search` + `fetch_page` |

---

## Run it

### Offline (no keys, no containers)

```bash
npm install
npm run dev          # http://localhost:3000
```

The full graph runs immediately against mock LLM + fixture search + in-memory store.

> Tip: don't run `next build` while `next dev` is live — they share `.next` and will conflict.

### Live (real search + reasoning + pgvector)

```bash
docker compose up -d           # SearXNG (:8080) + Postgres/pgvector (:5432)
cp .env.local.example .env.local
```

Then set in `.env.local` (each capability turns "real" independently):

```
GOOGLE_API_KEY=your_key_here          # https://aistudio.google.com/apikey
SEARXNG_URL=http://localhost:8080
DATABASE_URL=postgresql://synthesis:synthesis@localhost:5432/synthesis
```

### MCP server

```bash
npm run mcp                    # speaks MCP over stdio: web_search, fetch_page
```

Point any MCP client (Claude Desktop, etc.) at `tsx mcp/server.ts` to consume Synthesis's tools.

### Scripts

| Command | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build + typecheck |
| `npm run test` | Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |
| `npm run mcp` | Run the MCP tool server |

---

## Features

- **Live control room** — a lane per agent (planner, each parallel researcher, critic), streaming
  tool calls and thoughts; a plan strip; and the report assembling with a blinking caret.
- **Cited & verified** — every claim carries an inline `[n]` citation; the critic ledger labels each
  claim's confidence; dangling citations are detected.
- **Evidence graph** — an interactive SVG linking claims to the sources that support them, colored
  by confidence.
- **Shareable runs** — every completed run is persisted and gets a read-only `/run/<id>` URL.
- **Cost-aware** — a per-run token + USD meter; tiered models (fast researchers, strong synth/critic).
- **Export** — download the report as Markdown or print to PDF (clean print stylesheet).
- **MCP** — the research tools are exposed over the Model Context Protocol.

---

## Roadmap

- [x] **P0 — Skeleton.** Streaming single-agent answer over SSE.
- [x] **P1 — Tools.** `search` (SearXNG), `fetch_page`, `embed + retrieve`; report cites real URLs.
- [x] **P2 — Graph.** Planner + parallel Researchers + Synthesizer over a concurrent event bus.
- [x] **P3 — Control room.** Lanes per agent, live tool-call cards, plan strip.
- [x] **P4 — Critic loop.** Per-claim confidence + bounded revise loop.
- [x] **P5 — Report + graph.** Cited report, evidence graph, shareable run URLs.
- [x] **P6 — Polish & MCP.** MCP server, cost meter, Markdown/PDF export, favicon/OG, design pass.

---

## Quality

TypeScript strict throughout · zod-validated agent I/O · Vitest unit tests (text, chunking,
citations, search parsing) · structured `RunEvent` logging that also powers the UI · keyboard-run
(⌘/Ctrl+⏎) · `prefers-reduced-motion` respected · mobile-friendly report.

## Tech

Next.js (App Router) · TypeScript (strict) · Tailwind v4 · Server-Sent Events · Google Gemini
(provider-agnostic adapter) · SearXNG · Postgres + pgvector · Model Context Protocol · Vitest · zod.

Design direction: a warm, dense **mission-ops** aesthetic — Space Grotesk console chrome, Newsreader
serif report body, JetBrains Mono labels, one amber accent for the active agent, and a semantic
palette for claim confidence. There's a short tour of the *why* and the build at
[`/about-project`](https://synthesis-charan.vercel.app/about-project).

---

## About the developer

**Chanda Charan Reddy** — AI & Automation Engineer, Bangalore.

I ship production LLM systems: a Springer-published model that reads chest X-rays well enough for a
radiologist to take seriously, document pipelines that quietly run themselves, and — before any of
that — real-time control code for jet engines at DRDO. Synthesis is what happens when you point that
*don't-trust-output-you-can't-trace* instinct at language models.

- **Portfolio** — [charanreddy.dev](https://www.charanreddy.dev)
- **GitHub** — [@charanreddy-27](https://github.com/charanreddy-27)
- **LinkedIn** — [chandacharanreddy](https://www.linkedin.com/in/chandacharanreddy/)
- **Book a call** — [cal.com/charanreddy-27/30min](https://cal.com/charanreddy-27/30min)

> Want to build something — or break something interesting? This is one project; there are 18 more
> (and a few jet engines) over at [charanreddy.dev](https://www.charanreddy.dev). _Let's talk._
