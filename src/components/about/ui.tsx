import type { ReactNode } from "react";

/** Small mono eyebrow used to label every section, matching the control room. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted">{children}</h2>
  );
}

/** The shared surface card used across the static pages. */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-surface/40 p-5 backdrop-blur md:p-6 ${className}`}>
      {children}
    </section>
  );
}
