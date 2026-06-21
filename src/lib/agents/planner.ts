import { z } from "zod";
import { getProvider } from "@/lib/llm";
import { UsageMeter } from "@/lib/graph/usage";
import { now, type RunEvent, type SubQuestion } from "@/lib/events";

const LANE = "planner";

const PLANNER_SYSTEM = `You are the Planner agent inside Synthesis, an autonomous research engine.
Decompose the user's question into 3 to 5 focused, non-overlapping sub-questions that, researched
in parallel, together produce a complete answer. Prefer concrete, searchable sub-questions.
Respond with ONLY a JSON object of the form {"subQuestions": ["...", "..."]} and nothing else.`;

const PlanSchema = z.object({
  subQuestions: z.array(z.string().trim().min(4)).min(1).max(6),
});

function parsePlan(raw: string): string[] | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = PlanSchema.parse(JSON.parse(match[0]));
    return parsed.subQuestions;
  } catch {
    return null;
  }
}

export async function planner(
  ctx: { emit: (e: RunEvent) => void; usage: UsageMeter; signal?: AbortSignal },
  question: string,
): Promise<SubQuestion[]> {
  const { emit, usage, signal } = ctx;
  emit({ type: "lane_spawned", laneId: LANE, role: "planner", title: "Decomposing the question", ts: now() });
  emit({ type: "lane_status", laneId: LANE, status: "active", label: "Planning sub-questions", ts: now() });

  const llm = getProvider("strong");
  const userPrompt = `Question: ${question}\n\nReturn the JSON object with "subQuestions" now.`;

  let raw = "";
  try {
    for await (const chunk of llm.streamChat(
      [
        { role: "system", content: PLANNER_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      { signal, temperature: 0.4 },
    )) {
      raw += chunk.text;
      emit({ type: "token", laneId: LANE, text: chunk.text, ts: now() });
    }
  } catch (error) {
    emit({ type: "lane_status", laneId: LANE, status: "error", ts: now() });
    throw error;
  }
  usage.add(llm.model, PLANNER_SYSTEM + userPrompt, raw);

  const parsed = parsePlan(raw) ?? [question];
  const subQuestions: SubQuestion[] = parsed.map((text, i) => ({ id: `sq${i + 1}`, text }));

  emit({ type: "lane_status", laneId: LANE, status: "done", label: `${subQuestions.length} sub-questions`, ts: now() });
  return subQuestions;
}
