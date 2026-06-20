"use client";

import { useCallback, useRef, useState } from "react";
import type { RunEvent } from "@/lib/events";

type LaneStatus = "idle" | "active" | "done" | "error";

interface ConsoleState {
  status: LaneStatus;
  text: string;
  provider: string | null;
  error: string | null;
}

const INITIAL: ConsoleState = {
  status: "idle",
  text: "",
  provider: null,
  error: null,
};

export function QuestionConsole({ defaultQuestion }: { defaultQuestion: string }) {
  const [question, setQuestion] = useState(defaultQuestion);
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<ConsoleState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((event: RunEvent) => {
    setState((prev) => {
      switch (event.type) {
        case "run_started":
          return { ...prev, provider: event.provider };
        case "agent_status":
          if (event.agent !== "synthesizer") return prev;
          return { ...prev, status: event.status === "queued" ? "active" : event.status };
        case "token":
          if (event.agent !== "synthesizer") return prev;
          return { ...prev, text: prev.text + event.text };
        case "error":
          return { ...prev, status: "error", error: event.message };
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
    setState({ ...INITIAL, status: "active" });

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
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Request failed (${res.status})`);
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
          status: "error",
          error: error instanceof Error ? error.message : "Run failed",
        }));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [question, running, handleEvent]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <section className="space-y-5">
      <QuestionInput
        question={question}
        onChange={setQuestion}
        onRun={run}
        onStop={stop}
        running={running}
      />
      <AgentLane state={state} running={running} />
    </section>
  );
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
        <label
          htmlFor="question"
          className="font-mono text-[11px] uppercase tracking-widest text-muted"
        >
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

function AgentLane({ state, running }: { state: ConsoleState; running: boolean }) {
  const isIdle = state.status === "idle" && !state.text && !state.error;

  return (
    <div className="rounded-xl border border-border bg-surface/40 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <StatusDot status={state.status} />
          <span className="font-display text-sm font-medium tracking-wide text-text">
            Synthesizer
          </span>
          <StatusTag status={state.status} />
        </div>
        {state.provider ? (
          <span className="font-mono text-[11px] tracking-wide text-faint">{state.provider}</span>
        ) : null}
      </div>

      {isIdle ? (
        <IdleState />
      ) : state.error ? (
        <p className="font-mono text-sm leading-relaxed text-disputed">⚠ {state.error}</p>
      ) : (
        <div className={`report-body text-text ${running ? "caret" : ""}`}>{state.text}</div>
      )}
    </div>
  );
}

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <span className="inline-block h-2 w-2 rounded-full bg-accent-dim pulse" aria-hidden />
      <p className="font-mono text-xs uppercase tracking-widest text-faint">
        control room idle — run a question to begin
      </p>
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

function StatusTag({ status }: { status: LaneStatus }) {
  const label: Record<LaneStatus, string> = {
    idle: "queued",
    active: "active",
    done: "done",
    error: "error",
  };
  return (
    <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
      {label[status]}
    </span>
  );
}
