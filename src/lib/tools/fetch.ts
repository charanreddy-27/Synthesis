import { extractTitle, htmlToText } from "@/lib/text";

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
}

interface CacheEntry {
  title: string;
  text: string;
  at: number;
}

// In-process page cache. Swappable for Redis in the ops phase (P6).
const cache = new Map<string, CacheEntry>();
const TTL_MS = 30 * 60 * 1000;

/** Fetch a URL and reduce it to readable text, with a short-lived cache. */
export async function fetchPage(url: string, maxChars = 8000): Promise<FetchedPage> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return { url, title: hit.title, text: hit.text.slice(0, maxChars) };
  }

  const res = await fetch(url, {
    headers: {
      "user-agent": "SynthesisBot/0.1 (+https://github.com/synthesis; research agent)",
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`fetch_page failed (${res.status}) for ${url}`);
  }

  const html = await res.text();
  const title = extractTitle(html, url);
  const text = htmlToText(html);
  cache.set(url, { title, text, at: Date.now() });
  return { url, title, text: text.slice(0, maxChars) };
}
