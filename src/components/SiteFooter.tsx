import { PROFILE } from "@/lib/site";

/**
 * Shared bottom chrome. Left keeps the product's character line; right is a
 * subtle, ever-present door to the portfolio.
 */
export function SiteFooter() {
  return (
    <footer className="print-hide flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 font-mono text-[11px] tracking-wide text-faint">
      <span>multi-agent · cited · verified</span>
      <span>
        Built by{" "}
        <a
          href={PROFILE.portfolio}
          target="_blank"
          rel="noreferrer noopener"
          className="text-muted transition-colors hover:text-accent"
        >
          {PROFILE.shortName} Reddy
        </a>
      </span>
    </footer>
  );
}
