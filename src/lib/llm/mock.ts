import type {
  LlmMessage,
  LlmProvider,
  LlmStreamChunk,
  LlmStreamOptions,
} from "./types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The mock provider plays every agent role offline by keying on stable phrases in the prompt:
 * the Planner JSON, the Critic JSON, and the Synthesizer's cited report. It lets the entire
 * multi-agent graph run — and demo — with no API key.
 */
function composeMockAnswer(userText: string): string {
  if (userText.includes('"subQuestions"')) return mockPlan(userText);
  if (/confidence labels/i.test(userText) || /"confidence"/.test(userText)) return mockCritic(userText);

  const citations = [...new Set([...userText.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))]
    .filter((n) => n >= 1)
    .sort((a, b) => a - b);
  if (citations.length > 0) return mockReport(citations, /Revision required/i.test(userText));

  return "Synthesis is running in mock mode. Add a GOOGLE_API_KEY to .env.local for real Gemini reasoning.";
}

function mockPlan(userText: string): string {
  const question = (userText.match(/Question:\s*(.+)/)?.[1] ?? "the topic").trim().replace(/[?.]+$/, "");
  const subQuestions = [
    `What is the current state and key facts of ${question}?`,
    `What evidence, data, or real-world examples illustrate ${question}?`,
    `What are the main limitations, risks, or bottlenecks of ${question}?`,
  ];
  return JSON.stringify({ subQuestions });
}

function mockCritic(userText: string): string {
  const count = (userText.match(/^\s*\d+\)\s*Claim:/gm) ?? []).length || 1;
  const labels = Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    let confidence: "supported" | "single-source" | "disputed";
    let note: string;
    if (index === 1) {
      confidence = "supported";
      note = "corroborated by multiple cited passages";
    } else if (index === count && count >= 2) {
      confidence = "disputed";
      note = "the cited passage does not directly establish this claim";
    } else {
      confidence = "single-source";
      note = "rests on a single cited passage";
    }
    return { index, confidence, note };
  });
  return JSON.stringify(labels);
}

function mockReport(citations: number[], isRevision: boolean): string {
  const [first, second, ...rest] = citations;
  const lines: string[] = ["## Findings"];

  if (second !== undefined) {
    lines.push(
      `Across the retrieved sources the evidence converges on a clear, well-attested trend [${first}][${second}].`,
    );
  } else {
    lines.push(`The retrieved source points to a clear trend [${first}].`);
  }
  for (const n of rest) {
    lines.push(`A further line of evidence adds important detail to the picture [${n}].`);
  }
  if (citations.length >= 2) {
    lines.push(
      `\n## Caveats\nOne strand of the evidence is weaker and should be read with care [${citations[citations.length - 1]}].`,
    );
  }
  lines.push(
    `\n_${isRevision ? "Revised in response to critic feedback. " : ""}Assembled by the mock provider from ${citations.length} source(s); add a GOOGLE_API_KEY for genuine Gemini synthesis._`,
  );
  return lines.join("\n");
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
      await delay(10);
      yield { text: token };
    }
  }
}
