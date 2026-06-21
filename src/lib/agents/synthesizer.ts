import { getProvider } from "@/lib/llm";
import { UsageMeter } from "@/lib/graph/usage";
import { checkCitationIntegrity } from "@/lib/research/citations";
import type { Finding } from "@/lib/research/types";
import { now, type RunEvent, type SourceCard } from "@/lib/events";

const LANE = "synthesizer";

const SYNTHESIZER_SYSTEM = `You are the Synthesizer agent inside Synthesis, an autonomous research engine.
You receive a question and numbered sources with extracted passages. Write a concise, well-structured
Markdown report (use ## subheadings) that is fully grounded in those sources. Cite inline as [n]
matching the numbered sources; every non-obvious claim must carry a citation. Use only the provided
sources — never invent facts, numbers, or citations. If evidence is thin, say so.`;

export interface SynthesizerDeps {
  emit: (e: RunEvent) => void;
  usage: UsageMeter;
  signal?: AbortSignal;
}

export async function synthesizer(
  deps: SynthesizerDeps,
  input: {
    question: string;
    sources: SourceCard[];
    findings: Finding[];
    revisionNote?: string;
  },
): Promise<string> {
  const { emit, usage, signal } = deps;
  const { question, sources, findings, revisionNote } = input;

  emit({ type: "lane_spawned", laneId: LANE, role: "synthesizer", title: "Composing the report", ts: now() });
  emit({
    type: "lane_status",
    laneId: LANE,
    status: "active",
    label: revisionNote ? "Revising" : "Composing cited report",
    ts: now(),
  });

  const llm = getProvider("strong");
  const userPrompt = buildPrompt(question, sources, findings, revisionNote);

  let report = "";
  try {
    for await (const chunk of llm.streamChat(
      [
        { role: "system", content: SYNTHESIZER_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      { signal, temperature: 0.5 },
    )) {
      if (signal?.aborted) break;
      report += chunk.text;
      emit({ type: "token", laneId: LANE, text: chunk.text, ts: now() });
    }
  } catch (error) {
    emit({ type: "lane_status", laneId: LANE, status: "error", ts: now() });
    throw error;
  }
  usage.add(llm.model, SYNTHESIZER_SYSTEM + userPrompt, report);

  const integrity = checkCitationIntegrity(report, sources.length);
  if (!integrity.valid) {
    console.warn(`[synthesis] dangling citations ${JSON.stringify(integrity.invalid)}`);
  }

  emit({ type: "lane_status", laneId: LANE, status: "done", ts: now() });
  return report;
}

function buildPrompt(
  question: string,
  sources: SourceCard[],
  findings: Finding[],
  revisionNote?: string,
): string {
  if (sources.length === 0) {
    return `Question: ${question}\n\nNo sources were retrieved. Explain briefly that the research step returned no usable sources and that you cannot answer with citations.`;
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
    revisionNote ? `\nRevision required — address this critic feedback:\n${revisionNote}` : "",
    "",
    "Write the report now in clear Markdown with inline [n] citations.",
  ].join("\n");
}
