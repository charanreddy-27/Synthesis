import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { Panel, SectionLabel } from "@/components/about/ui";
import { ContactCard } from "@/components/about/ContactCard";
import { PROFILE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Charan Reddy — AI & Automation Engineer. I ship production LLM systems, from a Springer-published chest X-ray model to autonomous document pipelines.",
};

const LEARNED: { title: string; body: string }[] = [
  {
    title: "Concurrency was the real product.",
    body: "A planner fanning out to parallel researchers, each streaming onto its own lane, all draining through one event bus — getting that ordering right over SSE was harder than any single agent prompt. The visualization only feels alive because the plumbing underneath is honest about what's happening when.",
  },
  {
    title: "“Cited” means nothing without verification.",
    body: "It's trivial to make a model append [3] to a sentence. It's the critic loop — re-reading each claim against the passages it cites and labelling the confidence — that turns citations from decoration into evidence.",
  },
  {
    title: "Offline-first kept me honest.",
    body: "Every external dependency has a fallback: mock LLM, fixture search, in-memory vectors. The whole multi-agent pipeline runs with no keys and no containers. That constraint forced clean seams between the agents and the infrastructure.",
  },
  {
    title: "Streaming is a design problem, not a transport one.",
    body: "Tokens arriving in real time is the easy part. Deciding what a person should watch while five agents work in parallel — that's where most of the UI thinking went.",
  },
  {
    title: "The boring states are the ones that sell it.",
    body: "Empty, loading, error, reduced-motion. Nobody screenshots them, but they're the difference between a demo and something that feels built to last.",
  },
];

export default function AboutPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-12">
        {/* Intro */}
        <section className="reveal">
          <SectionLabel>About the developer</SectionLabel>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            {PROFILE.name}
          </h1>
          <p className="mt-2 font-mono text-[12px] uppercase tracking-widest text-accent">
            {PROFILE.title} · {PROFILE.location}
          </p>

          <div className="report-body mt-6 max-w-2xl text-text">
            <p className="mb-4">
              I&rsquo;m an AI engineer who ships production LLM systems — from a Springer-published
              model that reads chest X-rays well enough for a radiologist to take seriously, to
              document pipelines that quietly run themselves. Before any of that, I wrote real-time
              control code for jet engines at DRDO, where a millisecond of lag isn&rsquo;t a bug —
              it&rsquo;s a flameout.
            </p>
            <p>
              Synthesis is what happens when you point that instinct — <em>don&rsquo;t trust output
              you can&rsquo;t trace</em> — at language models. Most agent demos look like magic in a
              notebook and fall apart the moment a claim needs a source. This one shows its work:
              you watch it plan, search, cross-check, and verify every line before it commits.
            </p>
          </div>
        </section>

        {/* Portfolio tease */}
        <section className="reveal" style={{ animationDelay: "80ms" }}>
          <Panel className="bg-surface/60">
            <p className="text-[15px] leading-relaxed text-muted">
              This is one project. There are{" "}
              <span className="text-text">18 more (and a few jet engines)</span> over at{" "}
              <a
                href={PROFILE.portfolio}
                target="_blank"
                rel="noreferrer noopener"
                className="link-accent font-medium"
              >
                charanreddy.dev
              </a>
              . Go pull a few threads.
            </p>
          </Panel>
        </section>

        {/* What I learned */}
        <section className="reveal" style={{ animationDelay: "120ms" }}>
          <SectionLabel>What I learned building this</SectionLabel>
          <ol className="space-y-3">
            {LEARNED.map((item, i) => (
              <li
                key={item.title}
                className="flex gap-4 rounded-xl border border-border bg-surface/40 p-4 backdrop-blur transition-colors hover:border-accent-dim md:p-5"
              >
                <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-display text-base font-semibold text-text">{item.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Collaboration line */}
        <section className="reveal" style={{ animationDelay: "160ms" }}>
          <p className="font-serif text-xl leading-relaxed text-text sm:text-2xl">
            Want to build something — or break something interesting?{" "}
            <span className="text-accent">Let&rsquo;s talk.</span>
          </p>
        </section>

        {/* Contact */}
        <section className="reveal" style={{ animationDelay: "200ms" }}>
          <ContactCard />
        </section>
      </div>
    </PageShell>
  );
}
