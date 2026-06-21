"use client";

import type { AgentRole, AgentStatus } from "@/lib/events";
import { ToolCallFeed, type ToolCallView } from "@/components/ToolCallFeed";

export interface LaneView {
  id: string;
  role: AgentRole;
  title: string;
  status: AgentStatus;
  label?: string;
  tools: ToolCallView[];
  text: string;
}

export function LaneGrid({ lanes }: { lanes: LaneView[] }) {
  if (lanes.length === 0) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {lanes.map((lane) => (
        <LaneCard key={lane.id} lane={lane} />
      ))}
    </div>
  );
}

function LaneCard({ lane }: { lane: LaneView }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface/40 p-4 backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-border pb-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <StatusDot status={lane.status} />
          <div className="min-w-0">
            <div className="font-display text-sm font-medium tracking-wide text-text">
              {roleLabel(lane.role)}
            </div>
            <div className="truncate text-xs text-muted" title={lane.title}>
              {lane.title}
            </div>
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-faint">
          {lane.label ?? lane.status}
        </span>
      </div>

      {lane.role === "researcher" ? (
        lane.tools.length === 0 ? (
          <p className="font-mono text-xs text-faint">awaiting tool calls…</p>
        ) : (
          <ToolCallFeed calls={lane.tools} />
        )
      ) : lane.text ? (
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted">
          {lane.text}
        </pre>
      ) : (
        <p className="font-mono text-xs text-faint">thinking…</p>
      )}
    </div>
  );
}

function roleLabel(role: AgentRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function StatusDot({ status }: { status: AgentStatus }) {
  const color =
    status === "active"
      ? "bg-accent pulse"
      : status === "done"
        ? "bg-supported"
        : status === "error"
          ? "bg-disputed"
          : "bg-faint";
  return <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />;
}
