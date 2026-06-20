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

/**
 * When the prompt carries numbered sources, weave a short answer that cites them by [n]
 * so the offline demo still exercises the real citation → source rendering path.
 */
function composeMockAnswer(userText: string): string {
  const citations = [...new Set([...userText.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))]
    .filter((n) => n >= 1)
    .sort((a, b) => a - b);

  if (citations.length === 0) {
    return SAMPLE;
  }

  const sentences = citations.map(
    (n, i) =>
      `${i === 0 ? "Drawing on the retrieved sources, the evidence indicates a clear trend" : "A second strand of evidence reinforces this"} [${n}].`,
  );

  return [
    "## Synthesized answer _(mock mode)_",
    "",
    sentences.join(" "),
    "",
    `This response was assembled by the mock provider from ${citations.length} retrieved source(s); every claim is tied to a citation above. Add a GOOGLE_API_KEY to .env.local for genuine Gemini synthesis.`,
  ].join("\n");
}

export class MockProvider implements LlmProvider {
  readonly id = "mock";
  readonly model = "mock-1";

  async *streamChat(
    messages: LlmMessage[],
    options: LlmStreamOptions = {},
  ): AsyncGenerator<LlmStreamChunk, void, unknown> {
    const userText =
      [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    const text = composeMockAnswer(userText);
    const tokens = text.match(/\S+\s*|\s+/g) ?? [text];

    for (const token of tokens) {
      if (options.signal?.aborted) return;
      await delay(14);
      yield { text: token };
    }
  }
}
