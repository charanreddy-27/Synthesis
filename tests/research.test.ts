import { describe, expect, it } from "vitest";
import { chunkText, htmlToText, extractTitle } from "@/lib/text";
import { extractCitations, checkCitationIntegrity } from "@/lib/research/citations";
import { parseSearxngResults } from "@/lib/tools/search";

describe("htmlToText", () => {
  it("strips scripts, styles, and tags but keeps readable text", () => {
    const html = `<html><head><title>Doc</title><style>.a{color:red}</style></head>
      <body><script>evil()</script><h1>Hello</h1><p>World &amp; everyone</p></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("Hello");
    expect(text).toContain("World & everyone");
    expect(text).not.toContain("evil()");
    expect(text).not.toContain("color:red");
  });

  it("extracts the title with a fallback", () => {
    expect(extractTitle("<title> My Page </title>", "fallback")).toBe("My Page");
    expect(extractTitle("<html></html>", "https://x.test")).toBe("https://x.test");
  });
});

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    expect(chunkText("short text")).toEqual(["short text"]);
  });

  it("splits long text into overlapping chunks", () => {
    const text = "word ".repeat(600).trim(); // ~3000 chars
    const chunks = chunkText(text, 900, 150);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 900)).toBe(true);
  });
});

describe("citations", () => {
  it("extracts citation numbers in order", () => {
    expect(extractCitations("a [1] b [3] c [1]")).toEqual([1, 3, 1]);
  });

  it("flags citations that point past the available sources", () => {
    const ok = checkCitationIntegrity("grounded [1] and [2]", 2);
    expect(ok.valid).toBe(true);
    expect(ok.cited).toEqual([1, 2]);

    const bad = checkCitationIntegrity("hallucinated [3]", 2);
    expect(bad.valid).toBe(false);
    expect(bad.invalid).toEqual([3]);
  });
});

describe("parseSearxngResults", () => {
  it("maps SearXNG json into typed results and respects the limit", () => {
    const json = {
      results: [
        { url: "https://a.test", title: "A", content: "alpha", engine: "duckduckgo" },
        { url: "https://b.test", title: "B", content: "beta" },
        { title: "no url — skipped" },
        { url: "https://c.test", content: "gamma" },
      ],
    };
    const results = parseSearxngResults(json, 2);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ url: "https://a.test", title: "A", snippet: "alpha" });
    expect(results[1]?.url).toBe("https://b.test");
  });

  it("returns an empty array for malformed input", () => {
    expect(parseSearxngResults(null, 6)).toEqual([]);
    expect(parseSearxngResults({}, 6)).toEqual([]);
  });
});
