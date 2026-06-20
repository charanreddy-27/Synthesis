/**
 * The wire protocol between the orchestrator and the control room.
 * P0 only emits synthesizer events, but the union already covers every agent
 * role so later phases extend behaviour without changing the transport.
 */
export type AgentRole = "system" | "planner" | "researcher" | "synthesizer" | "critic";

export type AgentStatus = "queued" | "active" | "done" | "error";

export type ToolName = "search" | "fetch_page";
export type ToolStatus = "start" | "ok" | "error";

/** A citeable source, mirrored from research/types so the wire stays self-contained. */
export interface SourceCard {
  id: string;
  url: string;
  title: string;
  snippet: string;
}

export type RunEvent =
  | { type: "run_started"; runId: string; question: string; provider: string; ts: number }
  | { type: "agent_status"; agent: AgentRole; status: AgentStatus; label?: string; ts: number }
  | {
      type: "tool_call";
      id: string;
      agent: AgentRole;
      tool: ToolName;
      input: string;
      status: ToolStatus;
      detail?: string;
      ts: number;
    }
  | { type: "source"; source: SourceCard; ts: number }
  | { type: "token"; agent: AgentRole; text: string; ts: number }
  | { type: "run_done"; runId: string; ts: number }
  | { type: "error"; message: string; ts: number };

export function now(): number {
  return Date.now();
}
