import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Standard page frame: engineered grid backdrop, skip link, shared header/footer,
 * and a centered content column. Keeps every static page visually in lockstep
 * with the control room.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" aria-hidden />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-8">
        <SiteHeader />
        <main id="main" className="flex-1 py-10">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
