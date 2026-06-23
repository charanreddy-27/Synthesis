import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Panel, SectionLabel } from "@/components/about/ui";
import { ArrowIcon, GitHubIcon, LinkedInIcon } from "@/components/about/icons";
import { PROJECT } from "@/lib/site";

export const metadata: Metadata = {
  title: "The Project",
  description:
    "Why Synthesis exists, how it was built, the hard parts, and the technical decisions behind the multi-agent research engine.",
};

const TIMELINE: { date: string; title: string; body: string }[] = [
  {
    date: "Aug 2025",
    title: "The itch",
    body: "Every agent demo I tried answered with total confidence and cited nothing. I didn't want a better answer — I wanted to watch the work, and decide for myself whether to believe it.",
  },
  {
    date: "Sep 2025",
    title: "Design & scoping",
    body: "Settled the core bet: the product is the visualization of the agent graph. Not a chatbot with sources stapled on — a control room where you see the plan fan out, tool calls land, and a report assemble itself.",
  },
  {
    date: "Oct 2025",
    title: "MVP — one agent, real tools",
    body: "A single agent streaming a cited answer over SSE, backed by real search → fetch → chunk → embed → retrieve. The first time it cited a URL I could actually open, the whole idea clicked.",
  },
  {
    date: "Nov–Dec 2025",
    title: "The part that broke everything",
    body: "Planner plus parallel researchers, all draining through one concurrent event bus. Frames arrived out of order, lanes stepped on each other, and a single slow fetch could stall the stream. I rewrote the bus three times before the ordering held under load. This is the part I'm proudest of — and the part that nearly made me cut parallelism entirely.",
  },
  {
    date: "Jan 2026",
    title: "The critic loop",
    body: "Added the agent that re-reads every claim against the passages it cites, labels confidence (supported / single-source / disputed), and triggers a bounded revise loop. Dangling citations now get flagged instead of shipped.",
  },
  {
    date: "Mar 2026",
    title: "Report, graph, share, MCP",
    body: "The editorial report with inline citations, an interactive evidence graph, persisted shareable run URLs, a cost meter, Markdown/PDF export — and an MCP server so other agents can call the same tools.",
  },
  {
    date: "Jun 2026",
    title: "Polish & launch",
    body: "Accessibility pass, the boring-but-essential empty/loading/error states, docs, an About surface, and a clean deploy to Vercel.",
  },
];

const FEATURES: { title: string; body: string }[] = [
  {
    title: "Live control room",
    body: "A lane per agent — planner, each parallel researcher, critic — streaming tool calls and thoughts as they happen, with a plan strip and a report that types itself in.",
  },
  {
    title: "Cited & verified",
    body: "Every claim carries an inline [n] citation; the critic ledger labels each claim's confidence; dangling citations are detected automatically.",
  },
  {
    title: "Evidence graph",
    body: "An interactive SVG linking claims to the sources that support them, coloured by confidence — hover a node to trace its evidence.",
  },
  {
    title: "Shareable, cost-aware runs",
    body: "Every completed run persists to a read-only /run/<id> URL, with a per-run token and USD meter and tiered models (fast researchers, strong synth/critic).",
  },
];

const DECISIONS: { title: string; body: string }[] = [
  {
    title: "A concurrent event bus, not a request/response chain",
    body: "Agents are many independent producers; the SSE route is a single consumer. A many-producer / single-consumer bus with typed, lane-oriented RunEvents let parallel researchers stream simultaneously without clobbering each other — and made the live UI a direct projection of what the graph is doing.",
  },
  {
    title: "Verification as a first-class agent",
    body: "Instead of trusting the model to cite well, a separate critic extracts claims and checks each against its cited passages. Confidence labels and the bounded revise loop come straight from that check — citation integrity is enforced, not assumed.",
  },
  {
    title: "An offline fallback for every dependency",
    body: "LLM, search, embeddings, vector store, run history — each has a real implementation and a zero-infra mock. The pipeline runs with no keys and no containers, which forced clean seams between the agents and the world they talk to.",
  },
];

const STACK: { name: string; why: string }[] = [
  { name: "Next.js (App Router)", why: "one TypeScript codebase for UI and orchestration, with native server streaming." },
  { name: "TypeScript (strict) + zod", why: "agent I/O is a contract; types and runtime validation catch the dumb failures early." },
  { name: "Server-Sent Events", why: "the simplest thing that streams one-way — no websocket server to babysit." },
  { name: "Google Gemini (adapter)", why: "tiered models behind a provider-agnostic interface — cheap/fast for research, strong for synthesis." },
  { name: "SearXNG", why: "real web search, self-hosted, no metered API in the loop." },
  { name: "Postgres + pgvector", why: "retrieval that survives a restart — with an in-memory cosine store as the offline fallback." },
  { name: "Model Context Protocol", why: "exposes the research tools so any MCP client can reuse them." },
  { name: "Tailwind v4 + Vitest", why: "design tokens live in CSS; the parts that must not regress (chunking, citations, parsing) have tests." },
];

export default function AboutProjectPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-14">
        {/* Why */}
        <section className="reveal">
          <SectionLabel>About the project</SectionLabel>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Why Synthesis exists
          </h1>
          <div className="report-body mt-6 max-w-2xl text-text">
            <p className="mb-4">
              The web is full of AI that answers fast and proves nothing. Ask a hard question and
              you get a confident paragraph with no way to tell which parts are real. That gap —
              between <em>sounds right</em> and <em>is right</em> — is the whole reason this exists.
            </p>
            <p>
              Synthesis treats research the way a careful person would: break the question apart,
              chase down sources in parallel, read them, cross-check the claims, and only then write
              — with a citation behind every line and a confidence label on every claim. And it does
              it in the open, so you&rsquo;re never asked to take the answer on faith.
            </p>
          </div>
        </section>

        {/* Timeline */}
        <section className="reveal" style={{ animationDelay: "80ms" }}>
          <SectionLabel>How it came together</SectionLabel>
          <ol className="relative space-y-6 border-l border-border pl-6">
            {TIMELINE.map((m) => (
              <li key={m.date} className="relative">
                <span
                  className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-accent"
                  aria-hidden
                />
                <p className="font-mono text-[11px] uppercase tracking-widest text-accent">{m.date}</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-text">{m.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{m.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section className="reveal" style={{ animationDelay: "120ms" }}>
          <SectionLabel>Key features</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-surface/40 p-4 backdrop-blur transition-colors hover:border-accent-dim md:p-5"
              >
                <h3 className="font-display text-base font-semibold text-text">{f.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Technical decisions */}
        <section className="reveal" style={{ animationDelay: "160ms" }}>
          <SectionLabel>Interesting decisions & challenges</SectionLabel>
          <div className="space-y-3">
            {DECISIONS.map((d) => (
              <Panel key={d.title}>
                <h3 className="font-display text-base font-semibold text-text">{d.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{d.body}</p>
              </Panel>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section className="reveal" style={{ animationDelay: "200ms" }}>
          <SectionLabel>Tech stack — and why</SectionLabel>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/40 backdrop-blur">
            {STACK.map((s) => (
              <li key={s.name} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-4 md:px-5">
                <span className="shrink-0 font-display text-sm font-semibold text-text sm:w-56">
                  {s.name}
                </span>
                <span className="text-[14px] leading-relaxed text-muted">{s.why}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Project links */}
        <section className="reveal" style={{ animationDelay: "240ms" }}>
          <SectionLabel>Project links</SectionLabel>
          <div className="flex flex-wrap gap-2.5">
            <a
              href={PROJECT.repo}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:border-accent-dim hover:text-text"
            >
              <GitHubIcon className="h-4 w-4" />
              Source on GitHub
            </a>
            {PROJECT.linkedinPost ? (
              <a
                href={PROJECT.linkedinPost}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:border-accent-dim hover:text-text"
              >
                <LinkedInIcon className="h-4 w-4" />
                Launch post
              </a>
            ) : null}
          </div>
        </section>

        {/* CTA */}
        <section className="reveal" style={{ animationDelay: "280ms" }}>
          <Panel className="bg-surface/60">
            <h2 className="font-display text-xl font-semibold tracking-tight text-text sm:text-2xl">
              Want to build something or collaborate?
            </h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
              I&rsquo;m always up for a sharp problem — especially the ones that look like magic in a
              notebook and need someone to make them survive production.
            </p>
            <Link
              href="/about"
              className="group mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-bg transition-opacity hover:opacity-90"
            >
              Get in touch
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Panel>
        </section>
      </div>
    </PageShell>
  );
}
