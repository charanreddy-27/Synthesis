export interface EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  readonly dims: number;
  embed(texts: string[]): Promise<number[][]>;
}

class GoogleEmbeddings implements EmbeddingProvider {
  readonly id = "google";
  readonly dims = 768;
  constructor(
    readonly model: string,
    private readonly apiKey: string,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:batchEmbedContents?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${this.model}`,
          content: { parts: [{ text }] },
        })),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Embedding request failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    const json = (await res.json()) as { embeddings?: { values: number[] }[] };
    return (json.embeddings ?? []).map((e) => e.values);
  }
}

/**
 * Deterministic hashed bag-of-words embedding. No network, no key — texts that share
 * vocabulary get high cosine similarity, which is enough to exercise retrieval offline.
 */
class MockEmbeddings implements EmbeddingProvider {
  readonly id = "mock";
  readonly model = "mock-embed";
  readonly dims = 256;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.hashEmbed(text));
  }

  private hashEmbed(text: string): number[] {
    const vec = new Array<number>(this.dims).fill(0);
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (const token of tokens) {
      let hash = 2166136261;
      for (let i = 0; i < token.length; i++) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      vec[Math.abs(hash) % this.dims] += 1;
    }
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  const forced = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (forced === "mock" || !apiKey) {
    return new MockEmbeddings();
  }
  const model = process.env.GOOGLE_EMBED_MODEL?.trim() || "text-embedding-004";
  return new GoogleEmbeddings(model, apiKey);
}
