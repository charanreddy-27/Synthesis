import type { SourceCard } from "@/lib/events";

/**
 * Global, de-duplicating source registry shared by all parallel researchers.
 * The first researcher to discover a URL fixes its citation number; everyone else
 * reuses it, so citations are globally consistent across the report.
 */
export class SourceRegistry {
  private byUrl = new Map<string, SourceCard>();

  register(url: string, title: string, snippet: string): { source: SourceCard; isNew: boolean } {
    const existing = this.byUrl.get(url);
    if (existing) return { source: existing, isNew: false };
    const source: SourceCard = {
      id: String(this.byUrl.size + 1),
      url,
      title: title || url,
      snippet,
    };
    this.byUrl.set(url, source);
    return { source, isNew: true };
  }

  idForUrl(url: string): string | undefined {
    return this.byUrl.get(url)?.id;
  }

  list(): SourceCard[] {
    return [...this.byUrl.values()].sort((a, b) => Number(a.id) - Number(b.id));
  }
}
