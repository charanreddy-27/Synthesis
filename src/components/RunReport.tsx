"use client";

import type { ClaimCard, SourceCard, Usage } from "@/lib/events";
import { Report } from "@/components/Report";
import { SourceList } from "@/components/SourceList";
import { ClaimLedger } from "@/components/ClaimLedger";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { ReportToolbar } from "@/components/ReportToolbar";

/** The editorial output: cited report → critic ledger → evidence graph → sources. */
export function RunReport({
  question,
  report,
  sources,
  claims,
  usage,
  runId,
  streaming,
  done,
}: {
  question: string;
  report: string;
  sources: SourceCard[];
  claims: ClaimCard[];
  usage: Usage | null;
  runId: string | null;
  streaming: boolean;
  done: boolean;
}) {
  const status = streaming ? "active" : report ? "done" : "idle";
  return (
    <section className="rounded-xl border border-border bg-surface/40 p-5 backdrop-blur md:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status === "active" ? "bg-accent pulse" : status === "done" ? "bg-supported" : "bg-faint"
          }`}
          aria-hidden
        />
        <span className="font-display text-sm font-medium tracking-wide text-text">Synthesizer</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-faint">report</span>
      </div>

      <ReportToolbar
        question={question}
        report={report}
        sources={sources}
        claims={claims}
        usage={usage}
        runId={runId}
        done={done}
      />

      <div className="mt-4">
        {report ? (
          <>
            <Report report={report} sources={sources} streaming={streaming} />
            <ClaimLedger claims={claims} />
            <KnowledgeGraph question={question} claims={claims} sources={sources} />
            <SourceList sources={sources} />
          </>
        ) : (
          <p className="py-8 text-center font-mono text-xs text-faint">
            {streaming ? "composing the report…" : "waiting for researcher findings…"}
          </p>
        )}
      </div>
    </section>
  );
}
