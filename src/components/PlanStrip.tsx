"use client";

import type { SubQuestion } from "@/lib/events";

export function PlanStrip({ subQuestions }: { subQuestions: SubQuestion[] }) {
  if (subQuestions.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4 backdrop-blur">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
        Plan · {subQuestions.length} sub-questions
      </h2>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {subQuestions.map((sq, i) => (
          <li
            key={sq.id}
            className="flex gap-2.5 rounded-lg border border-border bg-surface/60 p-3 text-sm text-text"
          >
            <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
            <span className="leading-snug">{sq.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
