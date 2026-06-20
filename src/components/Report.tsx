"use client";

import { type ReactNode } from "react";
import type { SourceCard } from "@/lib/events";

/** Lightweight Markdown subset + inline [n] citation chips. Full rendering lands in P5. */
export function Report({
  report,
  sources,
  streaming,
}: {
  report: string;
  sources: SourceCard[];
  streaming: boolean;
}) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const blocks = report.split(/\n{2,}/).filter((b) => b.trim().length > 0);

  return (
    <div className="report-body text-text">
      {blocks.map((block, i) => (
        <Block key={i} block={block} byId={byId} />
      ))}
      {streaming ? <span className="caret align-middle" aria-hidden /> : null}
    </div>
  );
}

function Block({ block, byId }: { block: string; byId: Map<string, SourceCard> }) {
  const lines = block.split("\n");
  const heading = lines[0].match(/^(#{1,3})\s+(.*)$/);
  if (heading && lines.length === 1) {
    const level = heading[1].length;
    const content = renderInline(heading[2], byId);
    const cls =
      level === 1
        ? "mt-5 mb-2 font-display text-xl font-semibold"
        : level === 2
          ? "mt-5 mb-2 font-display text-lg font-semibold"
          : "mt-4 mb-1.5 font-display text-base font-semibold";
    return <p className={cls}>{content}</p>;
  }

  if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
    return (
      <ul className="my-2 list-disc space-y-1 pl-5">
        {lines.map((l, i) => (
          <li key={i}>{renderInline(l.replace(/^\s*[-*]\s+/, ""), byId)}</li>
        ))}
      </ul>
    );
  }

  return <p className="my-2.5 leading-relaxed">{renderInline(lines.join(" "), byId)}</p>;
}

const INLINE = /(\[(\d+)\])|(\*\*([^*]+)\*\*)|(_([^_]+)_)|(`([^`]+)`)/g;

function renderInline(text: string, byId: Map<string, SourceCard>): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;

  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1]) {
      const n = match[2];
      nodes.push(<Cite key={key++} n={n} source={byId.get(n)} />);
    } else if (match[3]) {
      nodes.push(<strong key={key++}>{match[4]}</strong>);
    } else if (match[5]) {
      nodes.push(<em key={key++}>{match[6]}</em>);
    } else if (match[7]) {
      nodes.push(
        <code key={key++} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em]">
          {match[8]}
        </code>,
      );
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Cite({ n, source }: { n: string; source?: SourceCard }) {
  if (!source) {
    return (
      <sup
        className="mx-0.5 rounded-sm bg-disputed/20 px-1 font-mono text-[0.7em] text-disputed"
        title="citation has no matching source"
      >
        [{n}]
      </sup>
    );
  }
  return (
    <a
      href={`#source-${n}`}
      title={source.title}
      className="mx-0.5 rounded-sm bg-accent/15 px-1 font-mono text-[0.7em] text-accent no-underline transition-colors hover:bg-accent/30"
    >
      [{n}]
    </a>
  );
}
