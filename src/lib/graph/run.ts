import { EventBus } from "@/lib/graph/bus";
import { UsageMeter } from "@/lib/graph/usage";
import { planner } from "@/lib/agents/planner";
import { researcher } from "@/lib/agents/researcher";
import { synthesizer } from "@/lib/agents/synthesizer";
import { critic } from "@/lib/agents/critic";
import { SourceRegistry } from "@/lib/research/registry";
import { getSearchProvider } from "@/lib/tools/search";
import { getEmbeddingProvider } from "@/lib/embeddings";
import { getVectorStore } from "@/lib/store";
import { getProvider } from "@/lib/llm";
import { saveRun } from "@/lib/runs/store";
import { now, type ClaimCard, type RunEvent } from "@/lib/events";

const MAX_REVISIONS = 1;

export interface RunInput {
  question: string;
  signal?: AbortSignal;
}

/**
 * The full research graph: Planner → parallel Researchers → Synthesizer ⇄ Critic (bounded
 * revise loop). Agents emit onto the event bus concurrently; the SSE route drains `stream()`.
 */
export function runResearch({ question, signal }: RunInput): AsyncGenerator<RunEvent> {
  const bus = new EventBus();
  void orchestrate(bus.emit, question, signal)
    .catch((error) => {
      bus.emit({
        type: "error",
        message: error instanceof Error ? error.message : "Run failed",
        ts: now(),
      });
    })
    .finally(() => bus.close());
  return bus.stream();
}

async function orchestrate(
  emit: (e: RunEvent) => void,
  question: string,
  signal?: AbortSignal,
): Promise<void> {
  const runId = crypto.randomUUID();
  const usage = new UsageMeter();
  const llm = getProvider("strong");

  emit({ type: "run_started", runId, question, provider: llm.model, ts: now() });

  // ---- Planner ----------------------------------------------------------
  const subQuestions = await planner({ emit, usage, signal }, question);
  emit({ type: "plan", subQuestions, ts: now() });

  // ---- Researchers (parallel) ------------------------------------------
  const registry = new SourceRegistry();
  const search = getSearchProvider();
  const embedder = getEmbeddingProvider();
  const store = await getVectorStore(embedder.dims);

  const perResearcher = await Promise.all(
    subQuestions.map((sq, i) =>
      researcher(
        { emit, usage, signal, search, embedder, store, registry },
        `researcher-${i}`,
        sq,
      ),
    ),
  );
  const findings = perResearcher.flat();
  const sources = registry.list();

  // ---- Synthesizer ⇄ Critic (bounded revise loop) ----------------------
  let report = await synthesizer({ emit, usage, signal }, { question, sources, findings });
  let result = await critic({ emit, usage, signal }, { report, sources, findings });
  let claims: ClaimCard[] = result.claims;

  let revisions = 0;
  while (result.disputed.length > 0 && revisions < MAX_REVISIONS && !signal?.aborted) {
    revisions++;
    const note = result.disputed
      .map((c) => `- "${c.text}" — ${c.note ?? "not supported by the cited passages"}`)
      .join("\n");
    emit({
      type: "report_reset",
      reason: `Critic flagged ${result.disputed.length} disputed claim(s); revising`,
      ts: now(),
    });
    report = await synthesizer({ emit, usage, signal }, { question, sources, findings, revisionNote: note });
    result = await critic({ emit, usage, signal }, { report, sources, findings });
    claims = result.claims;
  }

  // ---- Persist + finalize ----------------------------------------------
  const usageSnapshot = usage.snapshot();
  emit({ type: "usage", usage: usageSnapshot, ts: now() });

  await saveRun({
    id: runId,
    question,
    createdAt: now(),
    provider: llm.model,
    subQuestions,
    sources,
    report,
    claims,
    usage: usageSnapshot,
  });

  emit({ type: "run_done", runId, ts: now() });
}
