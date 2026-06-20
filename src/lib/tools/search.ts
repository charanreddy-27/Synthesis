import type { SearchResult } from "@/lib/research/types";

export interface SearchProvider {
  readonly id: string;
  search(query: string, limit?: number): Promise<SearchResult[]>;
}

/** Pure parser for a SearXNG `format=json` response — unit-tested in isolation. */
export function parseSearxngResults(json: unknown, limit: number): SearchResult[] {
  const results = (json as { results?: unknown[] } | null)?.results;
  if (!Array.isArray(results)) return [];

  const out: SearchResult[] = [];
  for (const raw of results) {
    const r = raw as Record<string, unknown>;
    const url = typeof r.url === "string" ? r.url : "";
    if (!url) continue;
    out.push({
      url,
      title: typeof r.title === "string" && r.title.trim() ? r.title : url,
      snippet: typeof r.content === "string" ? r.content : "",
      engine: typeof r.engine === "string" ? r.engine : undefined,
    });
    if (out.length >= limit) break;
  }
  return out;
}

class SearxngSearch implements SearchProvider {
  readonly id = "searxng";
  constructor(private readonly base: string) {}

  async search(query: string, limit = 6): Promise<SearchResult[]> {
    const url = `${this.base.replace(/\/$/, "")}/search?q=${encodeURIComponent(
      query,
    )}&format=json&safesearch=1&language=en`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      throw new Error(`SearXNG request failed (${res.status}). Is it running at ${this.base}?`);
    }
    return parseSearxngResults(await res.json(), limit);
  }
}

/**
 * Offline fixture: real, reputable URLs with pre-fetched content so the full
 * search → fetch → cite pipeline runs with zero infrastructure. Clearly labeled
 * as mock in the UI; swap in SearXNG by setting SEARXNG_URL.
 */
const MOCK_RESULTS: SearchResult[] = [
  {
    url: "https://en.wikipedia.org/wiki/Small_modular_reactor",
    title: "Small modular reactor — Wikipedia",
    snippet:
      "Small modular reactors (SMRs) are a class of nuclear fission reactors smaller than conventional reactors, designed to be factory-assembled and shipped to sites.",
    content:
      "Small modular reactors (SMRs) are nuclear fission reactors with a power output typically under 300 MWe, designed for factory fabrication and modular on-site assembly. Proponents argue that standardized, factory-built modules can reduce capital cost and construction time relative to large bespoke plants. SMR designs include light-water, molten-salt, and high-temperature gas-cooled variants. Commercial deployment has been slowed by first-of-a-kind engineering costs, regulatory licensing timelines, and supply-chain constraints for specialized components and fuel such as HALEU.",
  },
  {
    url: "https://www.iea.org/reports/electricity-2024",
    title: "Electricity 2024 — Analysis — IEA",
    snippet:
      "Electricity demand from data centres, AI and cryptocurrency could double by 2026 according to IEA analysis.",
    content:
      "The IEA projects that electricity consumption from data centres, artificial intelligence and cryptocurrency could double between 2022 and 2026, approaching the total electricity demand of Japan. Data centre operators are increasingly seeking firm, low-carbon power to meet round-the-clock demand, driving interest in nuclear options including small modular reactors. Grid interconnection queues and transmission constraints are emerging as a primary bottleneck for new large loads.",
  },
  {
    url: "https://www.energy.gov/ne/advanced-small-modular-reactors-smrs",
    title: "Advanced Small Modular Reactors (SMRs) — Department of Energy",
    snippet:
      "The U.S. Department of Energy supports the development and deployment of advanced small modular reactors.",
    content:
      "The U.S. Department of Energy notes that advanced SMRs offer advantages including smaller footprints, modular construction, and the potential for siting near industrial loads. Key deployment challenges identified include licensing under existing regulatory frameworks, securing high-assay low-enriched uranium (HALEU) fuel supply, and financing first-of-a-kind units. DOE programs aim to demonstrate designs and reduce the cost of subsequent deployments.",
  },
  {
    url: "https://www.reuters.com/business/energy/tech-giants-nuclear-data-centers-2024",
    title: "Tech giants turn to nuclear to power AI data centers — Reuters",
    snippet:
      "Major technology companies have signed agreements to procure nuclear power, including from small modular reactors, for their data centers.",
    content:
      "Several large technology companies have announced power-purchase agreements and investments tied to nuclear generation to supply their expanding fleet of AI data centers. Deals reference both restarting existing reactors and procuring future output from small modular reactors. Analysts caution that most SMR designs remain pre-commercial, with first units not expected online until the late 2020s or early 2030s, leaving a timing gap against near-term AI electricity demand.",
  },
];

class MockSearch implements SearchProvider {
  readonly id = "mock";
  async search(_query: string, limit = 6): Promise<SearchResult[]> {
    return MOCK_RESULTS.slice(0, limit);
  }
}

export function getSearchProvider(): SearchProvider {
  const base = process.env.SEARXNG_URL?.trim();
  const forced = process.env.SEARCH_PROVIDER?.trim().toLowerCase();
  if (base && forced !== "mock") {
    return new SearxngSearch(base);
  }
  return new MockSearch();
}
