import { getProvider } from "@/lib/llm";
import type { LlmMessage } from "@/lib/llm";
import { now, type RunEvent } from "@/lib/events";

const SYNTHESIZER_SYSTEM = `You are the Synthesizer agent inside Synthesis, an autonomous research engine.
In this phase you answer the user's question directly in clear, well-structured Markdown.
Be precise, concrete, and intellectually honest: when you are uncertain, say so plainly.
Never fabricate citations, statistics, or sources.`;

export interface RunInput {
  question: string;
  signal?: AbortSignal;
}

/**
 * P0 research graph: a single Synthesizer agent streamed end-to-end.
 *
 * This is intentionally an async generator of `RunEvent`s. Later phases expand it
 * in place into Planner -> parallel Researchers -> Synthesizer -> Critic without
 * changing the SSE transport or the UI's event handling.
 */
export async function* runResearch({ question, signal }: RunInput): AsyncGenerator<RunEvent> {
  const runId = crypto.randomUUID();
  const provider = getProvider("strong");

  yield { type: "run_started", runId, question, provider: provider.model, ts: now() };
  yield {
    type: "agent_status",
    agent: "synthesizer",
    status: "active",
    label: "Composing answer",
    ts: now(),
  };

  const messages: LlmMessage[] = [
    { role: "system", content: SYNTHESIZER_SYSTEM },
    { role: "user", content: question },
  ];

  try {
    for await (const chunk of provider.streamChat(messages, { signal })) {
      if (signal?.aborted) break;
      if (chunk.text) {
        yield { type: "token", agent: "synthesizer", text: chunk.text, ts: now() };
      }
    }
    yield { type: "agent_status", agent: "synthesizer", status: "done", ts: now() };
    yield { type: "run_done", runId, ts: now() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown synthesizer error";
    yield { type: "agent_status", agent: "synthesizer", status: "error", ts: now() };
    yield { type: "error", message, ts: now() };
  }
}
