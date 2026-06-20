# Synthesis

**An autonomous multi-agent research engine with a live "agent control room."**

Ask any real question. Watch a team of AI agents _plan → search → read → cross-check → synthesize_
a fully cited, interactive report — live. The product **is** the visualization of the agent graph:
you see sub-tasks spawn, tool calls land, and a critic agent flag weak claims, then a polished
report assembles itself with inline citations.

> **Status: P0 — Skeleton.** A single Synthesizer agent answers a question and streams its
> tokens to the control room over Server-Sent Events. The orchestration, transport, and UI shell
> are in place so later phases extend them without rework.

---

## Architecture

```
┌──────────────┐   question (POST)   ┌─────────────────────────────────────┐
│  Next.js UI  │ ──────────────────▶ │     Research graph (async gen)      │
│ control room │                     │  ┌────────┐  ┌──────────────────┐   │
│   + report   │ ◀──── SSE stream ── │  │Planner │─▶│ Researcher pool  │   │
└──────────────┘   RunEvent frames   │  └────────┘  │ (parallel, N=k)  │   │
                                     │       │      └────────┬─────────┘   │
                                     │       ▼               ▼             │
                                     │  ┌──────────┐   ┌───────────┐       │
                                     │  │Synthesizer│◀─│  Critic   │──┐    │
                                     │  └──────────┘   └───────────┘  │    │
                                     │        ▲────── revise loop ────┘    │
                                     └───────────────┬─────────────────────┘
                                                     │ tools (P1+)
                                         ┌───────────▼────────────┐
                                         │  SearXNG · fetch_page   │
                                         │  embed · Postgres/pgv   │
                                         └─────────────────────────┘
```

Everything runs in **one TypeScript codebase** (Next.js App Router). The agent graph is a
hand-rolled `async function*` that **yields typed `RunEvent`s**; the SSE route pipes those events
straight to the browser. Expanding from one agent to the full planner/researcher/critic graph means
yielding more of the same events — the transport and UI never change.

### Key modules

| Path | Role |
|---|---|
| [src/lib/llm/types.ts](src/lib/llm/types.ts) | `LlmProvider` interface — the provider-agnostic seam |
| [src/lib/llm/google.ts](src/lib/llm/google.ts) | Gemini streaming via the REST `streamGenerateContent` SSE API |
| [src/lib/llm/mock.ts](src/lib/llm/mock.ts) | Offline canned stream so the app runs with **no API key** |
| [src/lib/llm/index.ts](src/lib/llm/index.ts) | `getProvider(tier)` — picks model tier / mock from env |
| [src/lib/events.ts](src/lib/events.ts) | `RunEvent` union — the wire protocol between graph and UI |
| [src/lib/graph/run.ts](src/lib/graph/run.ts) | The research graph (P0 = single Synthesizer agent) |
| [src/app/api/run/route.ts](src/app/api/run/route.ts) | SSE endpoint: validates input, streams `RunEvent` frames |
| [src/components/QuestionConsole.tsx](src/components/QuestionConsole.tsx) | The control room — parses SSE, renders the live agent lane |

---

## Run it

```bash
npm install
cp .env.local.example .env.local   # optional — runs in mock mode without a key
npm run dev                        # http://localhost:3000
```

- **No key?** Synthesis falls back to **mock mode** automatically and streams a canned answer, so
  the full pipeline (input → SSE → live render) works offline.
- **Real reasoning?** Put a Gemini key in `.env.local`:

  ```
  GOOGLE_API_KEY=your_key_here
  GOOGLE_MODEL_SYNTHESIZER=gemini-2.5-pro
  ```

  Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

### Scripts

| Command | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build + typecheck |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (next config) |

---

## How the agents will coordinate

- **Planner** decomposes the question into a tree of sub-questions + a research strategy.
- **Researchers (×k, parallel)** each take a sub-question, search (SearXNG), fetch + extract
  passages, and return structured findings with source URLs.
- **Synthesizer** composes the report; every claim references a finding ID.
- **Critic** verifies each claim against its cited passage, labels confidence
  (`supported` / `single-source` / `disputed`), and can send claims back for more research
  (bounded loop, capped iterations).

Tiered models keep it cost-aware: a fast model for researchers, a stronger model for
synthesizer/critic.

---

## Roadmap

- [x] **P0 — Skeleton.** Next.js app + streaming single-agent answer over SSE.
- [ ] **P1 — Tools.** `search` (SearXNG), `fetch_page`, `embed + store` (pgvector); cite a real URL.
- [ ] **P2 — Graph.** Planner + parallel Researchers + Synthesizer as a real state graph.
- [ ] **P3 — Control room.** Lanes per agent, event timeline, live tool-call cards.
- [ ] **P4 — Critic loop.** Claim verification + confidence labels + bounded revise loop.
- [ ] **P5 — Report + graph.** Interactive report, inline citations, knowledge graph, shareable URLs.
- [ ] **P6 — Polish & MCP.** Expose tools as an MCP server, cost/token meter, export, design pass.

---

## Tech

Next.js (App Router) · TypeScript (strict) · Tailwind v4 · Server-Sent Events · Google Gemini
(provider-agnostic adapter) · zod.

Design direction: a warm, dense **mission-ops** aesthetic — Space Grotesk for console chrome,
Newsreader serif for the editorial report body, JetBrains Mono for timestamps/labels, one amber
accent for the active agent, and a semantic palette for claim confidence. Motion is purposeful and
respects `prefers-reduced-motion`.
