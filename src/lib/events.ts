/**
 * The wire protocol between the orchestrator and the control room.
 *
 * Everything is lane-oriented: each agent instance (planner, each parallel researcher,
 * the synthesizer, the critic) is a "lane" the UI renders. Parallel agents emit onto their
 * own lanes concurrently through the event bus.
 */
export type AgentRole = "planner" | "researcher" | "synthesizer" | "critic" | "system";

export type AgentStatus = "queued" | "active" | "done" | "error";

export type ToolName = "search" | "fetch_page";
export type ToolStatus = "start" | "ok" | "error";

/** Confidence the critic assigns to each claim. */
export type Confidence = "supported" | "single-source" | "disputed";

export interface SourceCard {
  id: string;
  url: string;
  title: string;
  snippet: string;
}

export interface SubQuestion {
  id: string;
  text: string;
}

export interface ClaimCard {
  id: string;
  text: string;
  sourceIds: string[];
  confidence: Confidence;
  note?: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  usd: number;
}

export type RunEvent =
  | { type: "run_started"; runId: string; question: string; provider: string; ts: number }
  | { type: "plan"; subQuestions: SubQuestion[]; ts: number }
  | { type: "lane_spawned"; laneId: string; role: AgentRole; title: string; ts: number }
  | { type: "lane_status"; laneId: string; status: AgentStatus; label?: string; ts: number }
  | {
      type: "tool_call";
      laneId: string;
      id: string;
      tool: ToolName;
      input: string;
      status: ToolStatus;
      detail?: string;
      ts: number;
    }
  | { type: "source"; source: SourceCard; ts: number }
  | { type: "token"; laneId: string; text: string; ts: number }
  | { type: "report_reset"; reason: string; ts: number }
  | { type: "claims"; claims: ClaimCard[]; ts: number }
  | { type: "usage"; usage: Usage; ts: number }
  | { type: "run_done"; runId: string; ts: number }
  | { type: "error"; message: string; laneId?: string; ts: number };

export function now(): number {
  return Date.now();
}
