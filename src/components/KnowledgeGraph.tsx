"use client";

import { useMemo, useState } from "react";
import type { ClaimCard, Confidence, SourceCard } from "@/lib/events";

const CONF_COLOR: Record<Confidence, string> = {
  supported: "var(--color-supported)",
  "single-source": "var(--color-uncertain)",
  disputed: "var(--color-disputed)",
};

interface Node {
  id: string;
  kind: "question" | "claim" | "source";
  x: number;
  y: number;
  label: string;
  color: string;
}

const W = 680;
const H = 440;

/** A self-contained SVG evidence graph: claims linked to the sources that support them. */
export function KnowledgeGraph({
  question,
  claims,
  sources,
}: {
  question: string;
  claims: ClaimCard[];
  sources: SourceCard[];
}) {
  const [hover, setHover] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const cx = W / 2;
    const cy = H / 2;
    const nodeList: Node[] = [
      { id: "q", kind: "question", x: cx, y: cy, label: question, color: "var(--color-accent)" },
    ];

    const claimR = 120;
    claims.forEach((claim, i) => {
      const a = (i / Math.max(claims.length, 1)) * Math.PI * 2 - Math.PI / 2;
      nodeList.push({
        id: claim.id,
        kind: "claim",
        x: cx + claimR * Math.cos(a),
        y: cy + claimR * Math.sin(a),
        label: claim.text,
        color: CONF_COLOR[claim.confidence],
      });
    });

    const srcR = 200;
    sources.forEach((source, i) => {
      const a = (i / Math.max(sources.length, 1)) * Math.PI * 2 - Math.PI / 2 + Math.PI / sources.length;
      nodeList.push({
        id: `s${source.id}`,
        kind: "source",
        x: cx + srcR * Math.cos(a),
        y: cy + srcR * Math.sin(a),
        label: source.title,
        color: "var(--color-muted)",
      });
    });

    const edgeList: { from: string; to: string; color: string }[] = [];
    for (const claim of claims) {
      edgeList.push({ from: "q", to: claim.id, color: "var(--color-border)" });
      for (const sid of claim.sourceIds) {
        edgeList.push({ from: claim.id, to: `s${sid}`, color: CONF_COLOR[claim.confidence] });
      }
    }
    return { nodes: nodeList, edges: edgeList };
  }, [question, claims, sources]);

  if (claims.length === 0) return null;
  const posOf = (id: string) => nodes.find((n) => n.id === id);
  const isActive = (id: string) =>
    !hover || hover === id || edges.some((e) => (e.from === hover && e.to === id) || (e.to === hover && e.from === id));

  return (
    <div className="mt-6 border-t border-border pt-4">
      <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">Evidence graph</h3>
      <div className="overflow-hidden rounded-xl border border-border bg-surface/30">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Evidence graph">
          {edges.map((edge, i) => {
            const a = posOf(edge.from);
            const b = posOf(edge.to);
            if (!a || !b) return null;
            const active = !hover || hover === edge.from || hover === edge.to;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={edge.color}
                strokeWidth={active ? 1.4 : 0.6}
                strokeOpacity={active ? 0.7 : 0.15}
              />
            );
          })}
          {nodes.map((node) => {
            const r = node.kind === "question" ? 9 : node.kind === "claim" ? 7 : 5;
            const active = isActive(node.id);
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHover(node.id)}
                onMouseLeave={() => setHover(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={node.color}
                  fillOpacity={active ? 1 : 0.25}
                  stroke="var(--color-bg)"
                  strokeWidth={1.5}
                />
                {(node.kind !== "source" || hover === node.id) && (
                  <text
                    x={node.x}
                    y={node.y - r - 5}
                    textAnchor="middle"
                    className="fill-[var(--color-muted)] font-mono"
                    fontSize={9}
                    opacity={active ? 1 : 0.3}
                  >
                    {truncate(node.label, node.kind === "question" ? 42 : 30)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function truncate(text: string, n: number): string {
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
}
