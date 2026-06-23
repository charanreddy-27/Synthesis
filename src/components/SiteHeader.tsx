"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, PROJECT } from "@/lib/site";

/**
 * Shared top chrome: wordmark + primary nav with an active indicator.
 * Used on every page so navigation and identity stay consistent.
 */
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="print-hide flex items-center justify-between gap-4 border-b border-border pb-4">
      <Link href="/" className="group flex items-baseline gap-3" aria-label="Synthesis — home">
        <span className="font-display text-lg font-semibold tracking-[0.2em] text-text transition-colors group-hover:text-accent">
          SYNTHESIS
        </span>
        <span className="hidden font-mono text-[11px] uppercase tracking-widest text-faint sm:inline">
          {PROJECT.tagline}
        </span>
      </Link>

      <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-widest transition-colors sm:px-2.5 ${
                active
                  ? "bg-surface-2 text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
