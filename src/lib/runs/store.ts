import { promises as fs } from "fs";
import path from "path";
import type { ClaimCard, SourceCard, SubQuestion, Usage } from "@/lib/events";

export interface RunRecord {
  id: string;
  question: string;
  createdAt: number;
  provider: string;
  subQuestions: SubQuestion[];
  sources: SourceCard[];
  report: string;
  claims: ClaimCard[];
  usage: Usage;
}

const DIR = path.join(process.cwd(), ".data", "runs");

/**
 * File-backed run store so completed runs get a shareable, read-only URL that survives reloads.
 * Swappable for Postgres later; the filesystem is enough for local + single-instance demos.
 */
export async function saveRun(record: RunRecord): Promise<void> {
  try {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(path.join(DIR, `${record.id}.json`), JSON.stringify(record), "utf8");
  } catch (error) {
    console.warn(`[synthesis] failed to persist run ${record.id}:`, error);
  }
}

export async function getRun(id: string): Promise<RunRecord | null> {
  if (!/^[a-f0-9-]{8,40}$/i.test(id)) return null;
  try {
    const raw = await fs.readFile(path.join(DIR, `${id}.json`), "utf8");
    return JSON.parse(raw) as RunRecord;
  } catch {
    return null;
  }
}
