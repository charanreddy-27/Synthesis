import type { RunEvent } from "./events";

/** Encode a run event as a single Server-Sent Events frame. */
export function sseFrame(event: RunEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
