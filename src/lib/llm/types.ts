export type LlmRole = "system" | "user" | "assistant";

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmStreamChunk {
  text: string;
}

export interface LlmStreamOptions {
  signal?: AbortSignal;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Thin, provider-agnostic streaming chat interface.
 * Every concrete provider (Google, mock, and later OpenAI/local) implements this,
 * so swapping models is a one-line change in `getProvider`.
 */
export interface LlmProvider {
  /** stable id, e.g. "google" or "mock" */
  readonly id: string;
  /** model name backing this instance */
  readonly model: string;
  streamChat(
    messages: LlmMessage[],
    options?: LlmStreamOptions,
  ): AsyncGenerator<LlmStreamChunk, void, unknown>;
}
