import { getProvider } from "@/lib/llm";
import type { LlmMessage } from "@/lib/llm";
import { getSearchProvider } from "@/lib/tools/search";
import { fetchPage } from "@/lib/tools/fetch";
import { getEmbeddingProvider } from "@/lib/embeddings";
import { getVectorStore } from "@/lib/store";
import { chunkText } from "@/lib/text";
import { checkCitationIntegrity } from "@/lib/research/citations";
import type { Finding, Source, StoredPassage } from "@/lib/research/types";
import { now, type RunEvent } from "@/lib/events";

const MAX_RESULTS = 6;
const MAX_SOURCES_FETCHED = 4;
const MAX_CHUNKS_PER_SOURCE = 5;
const TOP_FINDINGS = 6;
const MAX_SOURCES_CITED = 4;

const SYNTHESIZER_SYSTEM = `You are the Synthesizer agent inside Synthesis, an autonomous research engine.
You are given a question and a numbered list of sources with extracted passages.
Write a concise, well-structured Markdown answer that is fully grounded in those sources.
Cite inline using bracketed numbers like [1] or [2], matching the numbered sources.
Every non-obvious claim must carry a citation. Only use the provided sources — never invent
facts, numbers, or citations. If the sources are insufficient, say so plainly.`;

export interface RunInput {
  question: string;
  signal?: AbortSignal;
}

/**
 * P1 research graph: a single Researcher (search → fetch → embed → retrieve) that grounds
 * a citing Synthesizer. The structure — an async generator of RunEvents — is unchanged from
 * P0; later phases add a Planner, parallel Researchers, and a Critic loop in the same shape.
 */
export async function* runResearch({ question, signal }: RunInput): AsyncGenerator<RunEvent> {
  const runId = crypto.randomUUID();
  const llm = getProvider("strong");
  let toolSeq = 0;
  const toolId = () => `tc-${runId.slice(0, 8)}-${++toolSeq}`;

  yield { type: "run_started", runId, question, provider: llm.model, ts: now() };

  let sources: Source[] = [];
  let findings: Finding[] = [];

  // ---- Researcher -------------------------------------------------------
  try {
    yield {
      type: "agent_status",
      agent: "researcher",
      status: "active",
      label: "Searching the web",
      ts: now(),
    };

    const search = getSearchProvider();
    const searchId = toolId();
    yield { type: "tool_call", id: searchId, agent: "researcher", tool: "search", input: question, status: "start", ts: now() };
    const results = await search.search(question, MAX_RESULTS);
    yield {
      type: "tool_call",
      id: searchId,
      agent: "researcher",
      tool: "search",
      input: question,
      status: "ok",
      detail: `${results.length} results via ${search.id}`,
      ts: now(),
    };

    const passages: StoredPassage[] = [];
    const titleByUrl = new Map<string, string>();

    for (const result of results.slice(0, MAX_SOURCES_FETCHED)) {
      if (signal?.aborted) break;
      const fetchId = toolId();
      yield { type: "tool_call", id: fetchId, agent: "researcher", tool: "fetch_page", input: result.url, status: "start", ts: now() };

      let title = result.title;
      let body = result.content ?? "";
      try {
        if (!body) {
          const page = await fetchPage(result.url);
          title = page.title;
          body = page.text;
        }
        yield {
          type: "tool_call",
          id: fetchId,
          agent: "researcher",
          tool: "fetch_page",
          input: result.url,
          status: "ok",
          detail: `${body.length.toLocaleString()} chars`,
          ts: now(),
        };
      } catch (error) {
        // Fall back to the snippet so one bad fetch doesn't sink the run.
        body = result.snippet;
        yield {
          type: "tool_call",
          id: fetchId,
          agent: "researcher",
          tool: "fetch_page",
          input: result.url,
          status: "error",
          detail: error instanceof Error ? error.message : "fetch failed",
          ts: now(),
        };
      }

      titleByUrl.set(result.url, title);
      const chunks = chunkText(body).slice(0, MAX_CHUNKS_PER_SOURCE);
      chunks.forEach((text, i) => {
        passages.push({ id: `${result.url}#${i}`, url: result.url, title, text, embedding: [] });
      });
    }

    // ---- embed + store + retrieve ----------------------------------------
    const embedder = getEmbeddingProvider();
    const store = await getVectorStore(embedder.dims);

    if (passages.length > 0) {
      const vectors = await embedder.embed(passages.map((p) => p.text));
      passages.forEach((p, i) => {
        p.embedding = vectors[i] ?? [];
      });
      await store.add(passages);

      const [questionVector] = await embedder.embed([question]);
      const hits = questionVector ? await store.query(questionVector, TOP_FINDINGS) : [];

      // Number sources by first appearance among the relevant passages.
      const order = new Map<string, number>();
      for (const hit of hits) {
        const url = hit.passage.url;
        if (!order.has(url) && order.size < MAX_SOURCES_CITED) {
          order.set(url, order.size + 1);
        }
      }

      sources = [...order.entries()].map(([url, n]) => {
        const result = results.find((r) => r.url === url);
        return {
          id: String(n),
          url,
          title: titleByUrl.get(url) ?? result?.title ?? url,
          snippet: result?.snippet ?? "",
        };
      });

      findings = hits
        .filter((hit) => order.has(hit.passage.url))
        .map((hit, i) => ({
          id: `f${i + 1}`,
          sourceId: String(order.get(hit.passage.url)),
          url: hit.passage.url,
          text: hit.passage.text,
          score: hit.score,
        }));
    }

    for (const source of sources) {
      yield { type: "source", source, ts: now() };
    }
    yield { type: "agent_status", agent: "researcher", status: "done", label: `${sources.length} sources`, ts: now() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Researcher failed";
    yield { type: "agent_status", agent: "researcher", status: "error", ts: now() };
    yield { type: "error", message, ts: now() };
    return;
  }

  // ---- Synthesizer ------------------------------------------------------
  try {
    yield { type: "agent_status", agent: "synthesizer", status: "active", label: "Composing cited answer", ts: now() };

    const messages: LlmMessage[] = [
      { role: "system", content: SYNTHESIZER_SYSTEM },
      { role: "user", content: buildSynthesizerPrompt(question, sources, findings) },
    ];

    let report = "";
    for await (const chunk of llm.streamChat(messages, { signal })) {
      if (signal?.aborted) break;
      if (chunk.text) {
        report += chunk.text;
        yield { type: "token", agent: "synthesizer", text: chunk.text, ts: now() };
      }
    }

    const integrity = checkCitationIntegrity(report, sources.length);
    if (!integrity.valid) {
      // P4's critic will act on this; for now we surface it in the server log.
      console.warn(`[synthesis] dangling citations ${JSON.stringify(integrity.invalid)} for run ${runId}`);
    }

    yield { type: "agent_status", agent: "synthesizer", status: "done", ts: now() };
    yield { type: "run_done", runId, ts: now() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Synthesizer failed";
    yield { type: "agent_status", agent: "synthesizer", status: "error", ts: now() };
    yield { type: "error", message, ts: now() };
  }
}

function buildSynthesizerPrompt(question: string, sources: Source[], findings: Finding[]): string {
  if (sources.length === 0) {
    return `Question: ${question}\n\nNo sources were retrieved. Briefly explain that the research step returned no usable sources and that you cannot answer with citations.`;
  }

  const blocks = sources.map((source) => {
    const passages = findings
      .filter((f) => f.sourceId === source.id)
      .slice(0, 2)
      .map((f) => `  - ${f.text}`)
      .join("\n");
    return `[${source.id}] ${source.title} — ${source.url}\n${passages}`;
  });

  return [
    `Question: ${question}`,
    "",
    "Numbered sources (cite inline as [n]; use only these):",
    blocks.join("\n\n"),
    "",
    "Write the answer now in clear Markdown with inline [n] citations.",
  ].join("\n");
}
