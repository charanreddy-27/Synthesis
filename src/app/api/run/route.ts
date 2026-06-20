import { z } from "zod";
import { runResearch } from "@/lib/graph/run";
import { sseFrame } from "@/lib/sse";
import { now } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RunRequest = z.object({
  question: z.string().trim().min(3).max(2000),
});

export async function POST(req: Request): Promise<Response> {
  let question: string;
  try {
    const body: unknown = await req.json();
    question = RunRequest.parse(body).question;
  } catch {
    return Response.json(
      { error: "Invalid request: 'question' must be a string of 3-2000 characters." },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runResearch({ question, signal: abort.signal })) {
          controller.enqueue(encoder.encode(sseFrame(event)));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream failed";
        controller.enqueue(encoder.encode(sseFrame({ type: "error", message, ts: now() })));
      } finally {
        controller.close();
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
