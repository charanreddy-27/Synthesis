import type {
  LlmMessage,
  LlmProvider,
  LlmStreamChunk,
  LlmStreamOptions,
} from "./types";

const SAMPLE = `Synthesis is running in mock mode because no GOOGLE_API_KEY was provided.

This is the P0 skeleton: your question reached a single Synthesizer agent, and these tokens are streaming back to the control room over Server-Sent Events — the exact transport the full multi-agent graph will use.

Drop a GOOGLE_API_KEY into .env.local to swap in real Gemini reasoning. The next phases add SearXNG-powered researchers running in parallel, a synthesizer that cites real sources, and a critic agent that verifies every claim and labels its confidence.`;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockProvider implements LlmProvider {
  readonly id = "mock";
  readonly model = "mock-1";

  async *streamChat(
    messages: LlmMessage[],
    options: LlmStreamOptions = {},
  ): AsyncGenerator<LlmStreamChunk, void, unknown> {
    const question =
      [...messages].reverse().find((message) => message.role === "user")?.content ??
      "your question";
    const text = `Question received: ${question}\n\n${SAMPLE}`;
    const tokens = text.match(/\S+\s*|\s+/g) ?? [text];

    for (const token of tokens) {
      if (options.signal?.aborted) return;
      await delay(16);
      yield { text: token };
    }
  }
}
