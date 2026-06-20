"use client";

import { useCallback, useRef, useState } from "react";
import type { RunEvent, SourceCard } from "@/lib/events";
import { Report } from "@/components/Report";
import { SourceList } from "@/components/SourceList";
import { ToolCallFeed, type ToolCallView } from "@/components/ToolCallFeed";

type LaneStatus = "idle" | "active" | "done" | "error";

interface RunState {
  provider: string | null;
  researcher: { status: LaneStatus; label?: string };
  synthesizer: { status: LaneStatus };
  tools: ToolCallView[];
  sources: SourceCard[];
  report: string;
  error: string | null;
}

const INITIAL: RunState = {
  provider: null,
  researcher: { status: "idle" },
  synthesizer: { status: "idle" },
  tools: [],
  sources: [],
  report: "",
  error: null,
};

export function QuestionConsole({ defaultQuestion }: { defaultQuestion: string }) {
  const [question, setQuestion] = useState(defaultQuestion);
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<RunState>(INITIAL);
  const [started, setStarted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((event: RunEvent) => {
    setState((prev) => {
      switch (event.type) {
        case "run_started":
          return { ...prev, provider: event.provider };
        case "agent_status": {
          const status: LaneStatus = event.status === "queued" ? "active" : event.status;
          if (event.agent === "researcher")
            return { ...prev, researcher: { status, label: event.label } };
          if (event.agent === "synthesizer") return { ...prev, synthesizer: { status } };
          return prev;
        }
        case "tool_call": {
          const view: ToolCallView = {
            id: event.id,
            tool: event.tool,
            input: event.input,
            status: event.status,
            detail: event.detail,
          };
          const idx = prev.tools.findIndex((t) => t.id === event.id);
          const tools =
            idx === -1 ? [...prev.tools, view] : prev.tools.map((t, i) => (i === idx ? view : t));
          return { ...prev, tools };
        }
        case "source":
          if (prev.sources.some((s) => s.id === event.source.id)) return prev;
          return { ...prev, sources: [...prev.sources, event.source] };
        case "token":
          if (event.agent !== "synthesizer") return prev;
          return { ...prev, report: prev.report + event.text };
        case "error":
          return { ...prev, error: event.message };
        case "run_done":
        default:
          return prev;
      }
    });
  }, []);

  const run = useCallback(async () => {
    const q = question.trim();
    if (q.length < 3 || running) return;

    setRunning(true);
    setStarted(true);
    setState({ ...INITIAL, researcher: { status: "active", label: "Searching the web" } });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error((await res.text().catch(() => "")) || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary: number;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const line = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          try {
            handleEvent(JSON.parse(line.slice(5).trim()) as RunEvent);
          } catch {
            /* ignore malformed frame */
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Run failed",
        }));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [question, running, handleEvent]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return (
    <section className="space-y-5">
      <QuestionInput
        question={question}
        onChange={setQuestion}
        onRun={run}
        onStop={stop}
        running={running}
      />

      {!started ? (
        <IdlePanel />
      ) : (
        <>
          <Lane
            name="Researcher"
            status={state.researcher.status}
            label={state.researcher.label}
            badge={state.provider ? badgeFor(state.provider) : undefined}
          >
            {state.tools.length === 0 ? (
              <p className="font-mono text-xs text-faint">awaiting tool calls…</p>
            ) : (
              <ToolCallFeed calls={state.tools} />
            )}
          </Lane>

          <Lane name="Synthesizer" status={state.synthesizer.status} badge={state.provider ?? undefined}>
            {state.error ? (
              <p className="font-mono text-sm text-disputed">⚠ {state.error}</p>
            ) : state.report ? (
              <>
                <Report
                  report={state.report}
                  sources={state.sources}
                  streaming={state.synthesizer.status === "active"}
                />
                <SourceList sources={state.sources} />
              </>
            ) : (
              <p className="font-mono text-xs text-faint">
                {state.synthesizer.status === "active" ? "composing…" : "waiting for findings…"}
              </p>
            )}
          </Lane>
        </>
      )}
    </section>
  );
}

function badgeFor(provider: string): string {
  return provider === "mock-1" ? "mock mode" : provider;
}

function QuestionInput({
  question,
  onChange,
  onRun,
  onStop,
  running,
}: {
  question: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onStop: () => void;
  running: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/70 p-4 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="question" className="font-mono text-[11px] uppercase tracking-widest text-muted">
          research question
        </label>
        <span className="font-mono text-[11px] tracking-wide text-faint">⌘/Ctrl + ⏎</span>
      </div>
      <textarea
        id="question"
        value={question}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onRun();
          }
        }}
        rows={2}
        spellCheck={false}
        className="w-full resize-none bg-transparent font-sans text-[15px] leading-relaxed text-text outline-none placeholder:text-faint"
        placeholder="Ask any real question…"
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        {running ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-md border border-border px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            Stop
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRun}
          disabled={running || question.trim().length < 3}
          className="rounded-md bg-accent px-5 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? "Running" : "Run"}
        </button>
      </div>
    </div>
  );
}

function Lane({
  name,
  status,
  label,
  badge,
  children,
}: {
  name: string;
  status: LaneStatus;
  label?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <StatusDot status={status} />
          <span className="font-display text-sm font-medium tracking-wide text-text">{name}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
            {label ?? status}
          </span>
        </div>
        {badge ? <span className="font-mono text-[11px] tracking-wide text-faint">{badge}</span> : null}
      </div>
      {children}
    </div>
  );
}

function IdlePanel() {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-5 backdrop-blur">
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="inline-block h-2 w-2 rounded-full bg-accent-dim pulse" aria-hidden />
        <p className="font-mono text-xs uppercase tracking-widest text-faint">
          control room idle — run a question to begin
        </p>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: LaneStatus }) {
  const color =
    status === "active"
      ? "bg-accent pulse"
      : status === "done"
        ? "bg-supported"
        : status === "error"
          ? "bg-disputed"
          : "bg-faint";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden />;
}
