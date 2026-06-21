import type { EmbeddingProvider } from "@/lib/embeddings";
import type { SearchProvider } from "@/lib/tools/search";
import type { VectorStore } from "@/lib/store";
import { fetchPage } from "@/lib/tools/fetch";
import { chunkText } from "@/lib/text";
import { SourceRegistry } from "@/lib/research/registry";
import { UsageMeter } from "@/lib/graph/usage";
import type { Finding, StoredPassage } from "@/lib/research/types";
import { now, type RunEvent, type SubQuestion } from "@/lib/events";

const MAX_RESULTS = 5;
const MAX_SOURCES_FETCHED = 3;
const MAX_CHUNKS_PER_SOURCE = 4;
const TOP_FINDINGS = 4;

export interface ResearcherDeps {
  emit: (e: RunEvent) => void;
  usage: UsageMeter;
  signal?: AbortSignal;
  search: SearchProvider;
  embedder: EmbeddingProvider;
  store: VectorStore;
  registry: SourceRegistry;
}

/**
 * One researcher = one sub-question. Searches, fetches the top results, embeds passages into the
 * shared store, retrieves the most relevant ones, and registers globally-numbered sources.
 * Runs concurrently with its siblings, emitting onto its own lane.
 */
export async function researcher(
  deps: ResearcherDeps,
  laneId: string,
  subQuestion: SubQuestion,
): Promise<Finding[]> {
  const { emit, signal, search, embedder, store, registry } = deps;
  let toolSeq = 0;
  const toolId = () => `${laneId}-tc-${++toolSeq}`;

  emit({ type: "lane_spawned", laneId, role: "researcher", title: subQuestion.text, ts: now() });
  emit({ type: "lane_status", laneId, status: "active", label: "Searching", ts: now() });

  try {
    const searchId = toolId();
    emit({ type: "tool_call", laneId, id: searchId, tool: "search", input: subQuestion.text, status: "start", ts: now() });
    const results = await search.search(subQuestion.text, MAX_RESULTS);
    emit({
      type: "tool_call",
      laneId,
      id: searchId,
      tool: "search",
      input: subQuestion.text,
      status: "ok",
      detail: `${results.length} hits`,
      ts: now(),
    });

    const passages: StoredPassage[] = [];
    for (const result of results.slice(0, MAX_SOURCES_FETCHED)) {
      if (signal?.aborted) break;
      const fetchId = toolId();
      emit({ type: "tool_call", laneId, id: fetchId, tool: "fetch_page", input: result.url, status: "start", ts: now() });

      let title = result.title;
      let body = result.content ?? "";
      try {
        if (!body) {
          const page = await fetchPage(result.url);
          title = page.title;
          body = page.text;
        }
        emit({
          type: "tool_call",
          laneId,
          id: fetchId,
          tool: "fetch_page",
          input: result.url,
          status: "ok",
          detail: `${body.length.toLocaleString()} chars`,
          ts: now(),
        });
      } catch (error) {
        body = result.snippet;
        emit({
          type: "tool_call",
          laneId,
          id: fetchId,
          tool: "fetch_page",
          input: result.url,
          status: "error",
          detail: error instanceof Error ? error.message.slice(0, 60) : "fetch failed",
          ts: now(),
        });
      }

      const chunks = chunkText(body).slice(0, MAX_CHUNKS_PER_SOURCE);
      chunks.forEach((text, i) => {
        passages.push({ id: `${laneId}:${result.url}#${i}`, url: result.url, title, text, embedding: [] });
      });
      // hold a title for registration below
      result.title = title;
    }

    let findings: Finding[] = [];
    if (passages.length > 0) {
      const vectors = await embedder.embed(passages.map((p) => p.text));
      passages.forEach((p, i) => {
        p.embedding = vectors[i] ?? [];
      });
      await store.add(passages);

      const [queryVector] = await embedder.embed([subQuestion.text]);
      const ownUrls = new Set(passages.map((p) => p.url));
      const hits = queryVector ? await store.query(queryVector, TOP_FINDINGS * 2) : [];

      const selected = hits.filter((h) => ownUrls.has(h.passage.url)).slice(0, TOP_FINDINGS);
      findings = selected.map((hit, i) => {
        const result = results.find((r) => r.url === hit.passage.url);
        const { source, isNew } = registry.register(
          hit.passage.url,
          hit.passage.title,
          result?.snippet ?? "",
        );
        if (isNew) emit({ type: "source", source, ts: now() });
        return {
          id: `${laneId}-f${i + 1}`,
          sourceId: source.id,
          url: hit.passage.url,
          text: hit.passage.text,
          score: hit.score,
        };
      });
    }

    emit({ type: "lane_status", laneId, status: "done", label: `${findings.length} findings`, ts: now() });
    return findings;
  } catch (error) {
    emit({ type: "lane_status", laneId, status: "error", ts: now() });
    emit({
      type: "error",
      laneId,
      message: error instanceof Error ? error.message : "Researcher failed",
      ts: now(),
    });
    return [];
  }
}
