import { QuestionConsole } from "@/components/QuestionConsole";

const DEFAULT_QUESTION =
  "How are small modular nuclear reactors being deployed to power AI data centers, and what are the main bottlenecks?";

export default function Home() {
  return (
    <main className="relative min-h-dvh">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" aria-hidden />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 py-6 sm:px-8">
        <TopBar />
        <div className="flex-1 py-8">
          <QuestionConsole defaultQuestion={DEFAULT_QUESTION} />
        </div>
        <Footer />
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="flex items-center justify-between border-b border-border pb-4">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-lg font-semibold tracking-[0.2em] text-text">
          SYNTHESIS
        </span>
        <span className="hidden font-mono text-[11px] uppercase tracking-widest text-faint sm:inline">
          autonomous research engine
        </span>
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent pulse" aria-hidden />
        <span>P1 · tools</span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="flex items-center justify-between border-t border-border pt-4 font-mono text-[11px] tracking-wide text-faint">
      <span>planner · researchers · synthesizer · critic</span>
      <span className="hidden sm:inline">SSE · streaming</span>
    </footer>
  );
}
