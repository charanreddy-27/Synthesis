/** Decode the small set of HTML entities that survive tag stripping. */
function decodeEntities(input: string): string {
  const named: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  return input
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (match) => named[match] ?? match)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

/**
 * Crude but dependency-free HTML → readable text. Good enough to feed passages to an
 * embedder/LLM; a readability-grade extractor is a later refinement.
 */
export function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<\/?(br|p|div|li|h[1-6]|tr|section|article|ul|ol)[^>]*>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  s = s.replace(/[ \t\f\v\r]+/g, " ");
  s = s.replace(/\s*\n\s*/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/** Extract a page title from raw HTML, falling back to the URL. */
export function extractTitle(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1] ? decodeEntities(match[1]).replace(/\s+/g, " ").trim() : "";
  return title || fallback;
}

/** Split text into overlapping chunks sized for embedding. */
export function chunkText(text: string, size = 900, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  const step = Math.max(1, size - overlap);
  for (let i = 0; i < clean.length; i += step) {
    const slice = clean.slice(i, i + size).trim();
    if (slice) chunks.push(slice);
    if (i + size >= clean.length) break;
  }
  return chunks;
}
