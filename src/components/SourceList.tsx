"use client";

import type { SourceCard } from "@/lib/events";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourceList({ sources }: { sources: SourceCard[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-6 border-t border-border pt-4">
      <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
        Sources · {sources.length}
      </h3>
      <ol className="space-y-2.5">
        {sources.map((source) => (
          <li
            key={source.id}
            id={`source-${source.id}`}
            className="flex gap-3 scroll-mt-20 rounded-lg border border-border bg-surface/50 p-3"
          >
            <span className="mt-0.5 h-5 w-5 shrink-0 rounded bg-accent/15 text-center font-mono text-xs leading-5 text-accent">
              {source.id}
            </span>
            <div className="min-w-0">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="block truncate font-sans text-sm text-text hover:text-accent"
              >
                {source.title}
              </a>
              <div className="mt-0.5 font-mono text-[11px] text-faint">{domainOf(source.url)}</div>
              {source.snippet ? (
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">
                  {source.snippet}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
