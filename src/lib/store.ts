import type { StoredPassage } from "@/lib/research/types";

export interface QueryHit {
  passage: StoredPassage;
  score: number;
}

export interface VectorStore {
  readonly id: string;
  add(passages: StoredPassage[]): Promise<void>;
  query(embedding: number[], k: number): Promise<QueryHit[]>;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** Default store: in-process, dimension-agnostic. Used whenever DATABASE_URL is unset. */
export class MemoryVectorStore implements VectorStore {
  readonly id = "memory";
  private items: StoredPassage[] = [];

  async add(passages: StoredPassage[]): Promise<void> {
    this.items.push(...passages);
  }

  async query(embedding: number[], k: number): Promise<QueryHit[]> {
    return this.items
      .map((passage) => ({ passage, score: cosine(embedding, passage.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

interface PgPool {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

class PgVectorStore implements VectorStore {
  readonly id = "pgvector";
  constructor(
    private readonly pool: PgPool,
    private readonly dims: number,
  ) {}

  async add(passages: StoredPassage[]): Promise<void> {
    for (const p of passages) {
      if (p.embedding.length !== this.dims) continue;
      const vector = `[${p.embedding.join(",")}]`;
      await this.pool.query(
        `INSERT INTO passages (id, url, title, text, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.url, p.title, p.text, vector],
      );
    }
  }

  async query(embedding: number[], k: number): Promise<QueryHit[]> {
    const vector = `[${embedding.join(",")}]`;
    const { rows } = await this.pool.query(
      `SELECT id, url, title, text, 1 - (embedding <=> $1::vector) AS score
       FROM passages
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vector, k],
    );
    return rows.map((row) => ({
      passage: {
        id: String(row.id),
        url: String(row.url),
        title: String(row.title),
        text: String(row.text),
        embedding: [],
      },
      score: Number(row.score),
    }));
  }
}

let pgStore: VectorStore | null = null;

/**
 * Returns a pgvector-backed store when DATABASE_URL is set, otherwise an in-memory store.
 * The Postgres store is created once per process and its schema is ensured on first use.
 */
export async function getVectorStore(dims: number): Promise<VectorStore> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return new MemoryVectorStore();
  if (pgStore) return pgStore;

  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url });
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
  await pool.query(
    `CREATE TABLE IF NOT EXISTS passages (
       id text PRIMARY KEY,
       url text NOT NULL,
       title text NOT NULL,
       text text NOT NULL,
       embedding vector(${dims})
     )`,
  );
  pgStore = new PgVectorStore(pool as unknown as PgPool, dims);
  return pgStore;
}
