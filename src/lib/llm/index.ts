import { GoogleProvider } from "./google";
import { MockProvider } from "./mock";
import type { LlmProvider } from "./types";

export type { LlmMessage, LlmProvider, LlmStreamChunk } from "./types";

export type ModelTier = "fast" | "strong";

/**
 * Resolve the provider for a given model tier from the environment.
 * Researchers (P1+) use the "fast" tier; synthesizer/critic use "strong".
 * Falls back to the offline mock when no key is configured.
 */
export function getProvider(tier: ModelTier = "fast"): LlmProvider {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  const forced = process.env.LLM_PROVIDER?.trim().toLowerCase();

  if (forced === "mock" || !apiKey) {
    return new MockProvider();
  }

  const fast = process.env.GOOGLE_MODEL?.trim() || "gemini-2.5-flash";
  const strong = process.env.GOOGLE_MODEL_SYNTHESIZER?.trim() || "gemini-2.5-pro";
  return new GoogleProvider(tier === "strong" ? strong : fast, apiKey);
}
