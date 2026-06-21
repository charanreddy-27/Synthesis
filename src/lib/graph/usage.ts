import type { Usage } from "@/lib/events";

// Illustrative Gemini pricing, USD per 1M tokens. The point is to *show* cost-awareness.
const PRICES: { match: RegExp; input: number; output: number }[] = [
  { match: /pro/i, input: 1.25, output: 10 },
  { match: /flash/i, input: 0.3, output: 2.5 },
  { match: /embedding/i, input: 0.15, output: 0 },
];

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function priceFor(model: string): { input: number; output: number } {
  return PRICES.find((p) => p.match.test(model)) ?? { input: 0, output: 0 };
}

/** Accumulates token + cost estimates across every model call in a run. */
export class UsageMeter {
  private inputTokens = 0;
  private outputTokens = 0;
  private usd = 0;

  add(model: string, inputText: string, outputText: string): void {
    const inTok = estimateTokens(inputText);
    const outTok = estimateTokens(outputText);
    const price = priceFor(model);
    this.inputTokens += inTok;
    this.outputTokens += outTok;
    this.usd += (inTok / 1_000_000) * price.input + (outTok / 1_000_000) * price.output;
  }

  snapshot(): Usage {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      usd: Number(this.usd.toFixed(4)),
    };
  }
}
