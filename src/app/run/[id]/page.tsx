import { notFound } from "next/navigation";
import { getRun } from "@/lib/runs/store";
import { RunReport } from "@/components/RunReport";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getRun(id);
  if (!record) notFound();

  return (
    <main className="relative min-h-dvh">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" aria-hidden />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-8">
        <SiteHeader />

        <div id="main" className="flex-1 py-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-faint">shared run</p>
          <h1 className="mb-5 font-serif text-2xl leading-snug text-text">{record.question}</h1>
          <RunReport
            question={record.question}
            report={record.report}
            sources={record.sources}
            claims={record.claims}
            usage={record.usage}
            runId={record.id}
            streaming={false}
            done
          />
          <p className="mt-4 font-mono text-[11px] text-faint">
            {new Date(record.createdAt).toISOString()} · {record.provider}
          </p>
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}
