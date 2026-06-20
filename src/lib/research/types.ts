/** A raw hit from a search engine (SearXNG or the mock). */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  /** Optional pre-fetched body — supplied by the mock so offline runs need no network. */
  content?: string;
  engine?: string;
}

/** A numbered, citeable source surfaced to the report. `id` is the citation number. */
export interface Source {
  id: string;
  url: string;
  title: string;
  snippet: string;
}

/** A passage extracted from a source that supports a claim. */
export interface Finding {
  id: string;
  sourceId: string;
  url: string;
  text: string;
  score: number;
}

/** A chunk stored in the vector index. */
export interface StoredPassage {
  id: string;
  url: string;
  title: string;
  text: string;
  embedding: number[];
}
