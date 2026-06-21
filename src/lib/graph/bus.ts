import type { RunEvent } from "@/lib/events";

/**
 * Single-consumer, many-producer async event queue.
 *
 * The orchestrator and all parallel agents call `emit` concurrently; the SSE route drains
 * `stream()`. This is what lets multiple researcher lanes stream at the same time while the
 * transport stays a single ordered generator.
 */
export class EventBus {
  private buffer: RunEvent[] = [];
  private waiting: ((result: IteratorResult<RunEvent>) => void) | null = null;
  private closed = false;

  emit = (event: RunEvent): void => {
    if (this.closed) return;
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = null;
      resolve({ value: event, done: false });
    } else {
      this.buffer.push(event);
    }
  };

  close = (): void => {
    if (this.closed) return;
    this.closed = true;
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = null;
      resolve({ value: undefined as never, done: true });
    }
  };

  async *stream(): AsyncGenerator<RunEvent> {
    while (true) {
      if (this.buffer.length > 0) {
        yield this.buffer.shift() as RunEvent;
        continue;
      }
      if (this.closed) return;
      const result = await new Promise<IteratorResult<RunEvent>>((resolve) => {
        this.waiting = resolve;
      });
      if (result.done) return;
      yield result.value;
    }
  }
}
