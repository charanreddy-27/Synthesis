"use client";

import type { ToolName, ToolStatus } from "@/lib/events";

export interface ToolCallView {
  id: string;
  tool: ToolName;
  input: string;
  status: ToolStatus;
  detail?: string;
}

export function ToolCallFeed({ calls }: { calls: ToolCallView[] }) {
  if (calls.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {calls.map((call) => (
        <li
          key={call.id}
          className="flex items-center gap-2.5 font-mono text-[12px] leading-tight text-muted"
        >
          <ToolDot status={call.status} />
          <span className="uppercase tracking-wide text-faint">
            {call.tool === "search" ? "search" : "fetch"}
          </span>
          <span className="min-w-0 flex-1 truncate text-text/85">{call.input}</span>
          {call.detail ? (
            <span
              className={`shrink-0 ${call.status === "error" ? "text-disputed" : "text-faint"}`}
            >
              {call.detail}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ToolDot({ status }: { status: ToolStatus }) {
  const cls =
    status === "start"
      ? "bg-accent pulse"
      : status === "ok"
        ? "bg-supported"
        : "bg-disputed";
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cls}`} aria-hidden />;
}
