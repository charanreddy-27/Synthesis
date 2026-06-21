import { z } from "zod";
import { getProvider } from "@/lib/llm";
import { UsageMeter } from "@/lib/graph/usage";
import { extractClaims } from "@/lib/research/citations";
import type { Finding } from "@/lib/research/types";
import { now, type ClaimCard, type Confidence, type RunEvent, type SourceCard } from "@/lib/events";

const LANE = "critic";

const CRITIC_SYSTEM = `You are the Critic agent inside Synthesis. You verify each claim in a report
against the source passages it cites. For every claim assign a confidence:
- "supported": directly backed by two or more cited passages,
- "single-source": backed by exactly one cited passage,
- "disputed": not actually supported by the cited passages, or the passages conflict.
Be skeptical — your job is to catch unsupported claims. Respond with ONLY a JSON array
[{"index": <number>, "confidence": "...", "note": "<short reason>"}], one object per claim.`;

const LabelSchema = z.object({
  index: z.number().int(),
  confidence: z.enum(["supported", "single-source", "disputed"]),
  note: z.string().optional(),
});
const LabelsSchema = z.array(LabelSchema);

function parseLabels(raw: string): z.infer<typeof LabelsSchema> | null {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return LabelsSchema.parse(JSON.parse(match[0]));
  } catch {
    return null;
  }
}

export interface CriticDeps {
  emit: (e: RunEvent) => void;
  usage: UsageMeter;
  signal?: AbortSignal;
}

export interface CriticResult {
  claims: ClaimCard[];
  disputed: ClaimCard[];
}

export async function critic(
  deps: CriticDeps,
  input: { report: string; sources: SourceCard[]; findings: Finding[] },
): Promise<CriticResult> {
  const { emit, usage, signal } = deps;
  const { report, sources, findings } = input;

  emit({ type: "lane_spawned", laneId: LANE, role: "critic", title: "Verifying claims", ts: now() });
  emit({ type: "lane_status", laneId: LANE, status: "active", label: "Checking citations", ts: now() });

  const raw = extractClaims(report);
  if (raw.length === 0) {
    emit({ type: "lane_status", laneId: LANE, status: "done", label: "no claims", ts: now() });
    emit({ type: "claims", claims: [], ts: now() });
    return { claims: [], disputed: [] };
  }

  // Heuristic baseline: ≥2 cited sources → supported, exactly 1 → single-source.
  const heuristic: Confidence[] = raw.map((c) => (c.sourceIds.length >= 2 ? "supported" : "single-source"));

  const llm = getProvider("strong");
  const userPrompt = buildPrompt(raw, sources, findings);
  let labels = heuristic.map((confidence) => ({ confidence, note: undefined as string | undefined }));

  try {
    let out = "";
    for await (const chunk of llm.streamChat(
      [
        { role: "system", content: CRITIC_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      { signal, temperature: 0.2 },
    )) {
      out += chunk.text;
      emit({ type: "token", laneId: LANE, text: chunk.text, ts: now() });
    }
    usage.add(llm.model, CRITIC_SYSTEM + userPrompt, out);

    const parsed = parseLabels(out);
    if (parsed) {
      labels = raw.map((_, i) => {
        const found = parsed.find((p) => p.index === i + 1) ?? parsed[i];
        return {
          confidence: found?.confidence ?? heuristic[i],
          note: found?.note,
        };
      });
    }
  } catch {
    // fall back to the heuristic labels already in place
  }

  const claims: ClaimCard[] = raw.map((c, i) => ({
    id: `c${i + 1}`,
    text: c.text,
    sourceIds: c.sourceIds,
    confidence: labels[i].confidence,
    note: labels[i].note,
  }));

  const disputed = claims.filter((c) => c.confidence === "disputed");
  const supported = claims.filter((c) => c.confidence === "supported").length;
  emit({
    type: "lane_status",
    laneId: LANE,
    status: "done",
    label: `${supported}/${claims.length} supported · ${disputed.length} disputed`,
    ts: now(),
  });
  emit({ type: "claims", claims, ts: now() });
  return { claims, disputed };
}

function buildPrompt(
  raw: { text: string; sourceIds: string[] }[],
  sources: SourceCard[],
  findings: Finding[],
): string {
  const sourceText = (id: string) =>
    findings
      .filter((f) => f.sourceId === id)
      .slice(0, 2)
      .map((f) => f.text)
      .join(" ");

  const claimBlocks = raw.map((c, i) => {
    const cited = c.sourceIds
      .map((id) => {
        const src = sources.find((s) => s.id === id);
        return `   [${id}] ${src?.title ?? "unknown"}: ${sourceText(id).slice(0, 300)}`;
      })
      .join("\n");
    return `${i + 1}) Claim: ${c.text}\n   Cited passages:\n${cited}`;
  });

  return [
    "Evaluate each claim against its cited passages and return the JSON array of confidence labels.",
    "",
    "Claims:",
    claimBlocks.join("\n\n"),
  ].join("\n");
}
