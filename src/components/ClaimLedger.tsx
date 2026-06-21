"use client";

import type { ClaimCard, Confidence } from "@/lib/events";

const STYLES: Record<Confidence, { label: string; dot: string; text: string }> = {
  supported: { label: "supported", dot: "bg-supported", text: "text-supported" },
  "single-source": { label: "single source", dot: "bg-uncertain", text: "text-uncertain" },
  disputed: { label: "disputed", dot: "bg-disputed", text: "text-disputed" },
};

export function ConfidenceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-faint">
      {(Object.keys(STYLES) as Confidence[]).map((c) => (
        <span key={c} className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${STYLES[c].dot}`} aria-hidden />
          {STYLES[c].label}
        </span>
      ))}
    </div>
  );
}

export function ClaimLedger({ claims }: { claims: ClaimCard[] }) {
  if (claims.length === 0) return null;
  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Critic ledger · {claims.length} claims
        </h3>
        <ConfidenceLegend />
      </div>
      <ul className="space-y-2">
        {claims.map((claim) => {
          const style = STYLES[claim.confidence];
          return (
            <li key={claim.id} className="flex gap-3 rounded-lg border border-border bg-surface/40 p-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm leading-snug text-text">{claim.text}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                  <span className={`uppercase tracking-widest ${style.text}`}>{style.label}</span>
                  <span className="text-faint">
                    {claim.sourceIds.map((id) => `[${id}]`).join(" ")}
                  </span>
                  {claim.note ? <span className="text-faint">· {claim.note}</span> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
