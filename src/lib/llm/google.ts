import type {
  LlmMessage,
  LlmProvider,
  LlmStreamChunk,
  LlmStreamOptions,
} from "./types";

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

/**
 * Gemini has no "system" role: system messages are merged into `systemInstruction`,
 * and "assistant" maps to "model".
 */
function toGeminiRequest(messages: LlmMessage[]): {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiPart[] };
} {
  const systemTexts: string[] = [];
  const contents: GeminiContent[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      systemTexts.push(message.content);
      continue;
    }
    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    });
  }

  return {
    contents,
    systemInstruction:
      systemTexts.length > 0 ? { parts: [{ text: systemTexts.join("\n\n") }] } : undefined,
  };
}

export class GoogleProvider implements LlmProvider {
  readonly id = "google";

  constructor(
    readonly model: string,
    private readonly apiKey: string,
  ) {}

  async *streamChat(
    messages: LlmMessage[],
    options: LlmStreamOptions = {},
  ): AsyncGenerator<LlmStreamChunk, void, unknown> {
    const { contents, systemInstruction } = toGeminiRequest(messages);
    const url = `${API_ROOT}/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: options.signal,
      body: JSON.stringify({
        contents,
        ...(systemInstruction ? { systemInstruction } : {}),
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
        },
      }),
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 400)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload) as {
            candidates?: { content?: { parts?: GeminiPart[] } }[];
          };
          const text = json.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? "")
            .join("");
          if (text) yield { text };
        } catch {
          /* ignore keep-alive / partial frames */
        }
      }
    }
  }
}
