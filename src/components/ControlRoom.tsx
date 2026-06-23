"use client";

import { useCallback, useReducer, useRef, useState } from "react";
import type { AgentStatus, ClaimCard, RunEvent, SourceCard, SubQuestion, Usage } from "@/lib/events";
import { PlanStrip } from "@/components/PlanStrip";
import { LaneGrid, type LaneView } from "@/components/LaneGrid";
import { RunReport } from "@/components/RunReport";

interface State {
  runId: string | null;
  provider: string | null;
  subQuestions: SubQuestion[];
  lanes: LaneView[];
  synthStatus: AgentStatus | "idle";
  report: string;
  sources: SourceCard[];
  claims: ClaimCard[];
  usage: Usage | null;
  error: string | null;
  done: boolean;
}

const INITIAL: State = {
  runId: null,
  provider: null,
  subQuestions: [],
  lanes: [],
  synthStatus: "idle",
  report: "",
  sources: [],
  claims: [],
  usage: null,
  error: null,
  done: false,
};

type Action = RunEvent | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return INITIAL;
    case "run_started":
      return { ...state, runId: action.runId, provider: action.provider };
    case "plan":
      return { ...state, subQuestions: action.subQuestions };
    case "lane_spawned": {
      if (action.laneId === "synthesizer") return { ...state, synthStatus: "active" };
      if (state.lanes.some((l) => l.id === action.laneId)) return state;
      const lane: LaneView = {
        id: action.laneId,
        role: action.role,
        title: action.title,
        status: "queued",
        tools: [],
        text: "",
      };
      return { ...state, lanes: [...state.lanes, lane] };
    }
    case "lane_status": {
      if (action.laneId === "synthesizer") return { ...state, synthStatus: action.status };
      return {
        ...state,
        lanes: state.lanes.map((l) =>
          l.id === action.laneId ? { ...l, status: action.status, label: action.label } : l,
        ),
      };
    }
    case "tool_call": {
      return {
        ...state,
        lanes: state.lanes.map((l) => {
          if (l.id !== action.laneId) return l;
          const view = {
            id: action.id,
            tool: action.tool,
            input: action.input,
            status: action.status,
            detail: action.detail,
          };
          const idx = l.tools.findIndex((t) => t.id === action.id);
          return {
            ...l,
            tools: idx === -1 ? [...l.tools, view] : l.tools.map((t, i) => (i === idx ? view : t)),
          };
        }),
      };
    }
    case "source":
      if (state.sources.some((s) => s.id === action.source.id)) return state;
      return { ...state, sources: [...state.sources, action.source] };
    case "token":
      if (action.laneId === "synthesizer") return { ...state, report: state.report + action.text };
      return {
        ...state,
        lanes: state.lanes.map((l) =>
          l.id === action.laneId ? { ...l, text: l.text + action.text } : l,
        ),
      };
    case "report_reset":
      return { ...state, report: "", synthStatus: "active" };
    case "claims":
      return { ...state, claims: action.claims };
    case "usage":
      return { ...state, usage: action.usage };
    case "error":
      return { ...state, error: action.message };
    case "run_done":
      return { ...state, done: true };
    default:
      return state;
  }
}

export function ControlRoom({ defaultQuestion }: { defaultQuestion: string }) {
  const [question, setQuestion] = useState(defaultQuestion);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    const q = question.trim();
    if (q.length < 3 || running) return;

    dispatch({ type: "reset" });
    setRunning(true);
    setStarted(true);

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
            dispatch(JSON.parse(line.slice(5).trim()) as RunEvent);
          } catch {
            /* ignore malformed frame */
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        dispatch({ type: "error", message: error instanceof Error ? error.message : "Run failed", ts: Date.now() });
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [question, running]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return (
    <section className="space-y-4">
      <div className="print-hide">
        <QuestionInput question={question} onChange={setQuestion} onRun={run} onStop={stop} running={running} />
      </div>

      {!started ? (
        <IdlePanel />
      ) : (
        <>
          {state.error ? (
            <p
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-disputed/40 bg-disputed/10 p-4 font-mono text-sm text-disputed"
            >
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              <span>{state.error}</span>
            </p>
          ) : null}
          <div className="print-hide space-y-4">
            <PlanStrip subQuestions={state.subQuestions} />
            <LaneGrid lanes={state.lanes} />
          </div>
          <RunReport
            question={question}
            report={state.report}
            sources={state.sources}
            claims={state.claims}
            usage={state.usage}
            runId={state.runId}
            streaming={running && state.synthStatus === "active"}
            done={state.done}
          />
        </>
      )}
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
            className="cursor-pointer rounded-md border border-border px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            Stop
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRun}
          disabled={running || question.trim().length < 3}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-accent px-5 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-bg pulse" aria-hidden />
              Running
            </>
          ) : (
            "Run"
          )}
        </button>
      </div>
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
