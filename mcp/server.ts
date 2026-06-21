/**
 * Synthesis MCP server.
 *
 * Exposes Synthesis's own research tools (web search + page fetch) over the Model Context
 * Protocol, so any MCP-aware agent — including Synthesis itself — can consume them as standard
 * tools. Run with: `npm run mcp` (speaks MCP over stdio).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getSearchProvider } from "../src/lib/tools/search";
import { fetchPage } from "../src/lib/tools/fetch";

const server = new McpServer({ name: "synthesis-tools", version: "0.1.0" });

server.tool(
  "web_search",
  "Search the web and return ranked results (SearXNG when configured, mock fixtures otherwise).",
  { query: z.string().min(3), limit: z.number().int().min(1).max(10).optional() },
  async ({ query, limit }) => {
    const results = await getSearchProvider().search(query, limit ?? 6);
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  },
);

server.tool(
  "fetch_page",
  "Fetch a URL and return its readable text content.",
  { url: z.string().url(), maxChars: z.number().int().min(500).max(20000).optional() },
  async ({ url, maxChars }) => {
    const page = await fetchPage(url, maxChars ?? 8000);
    return { content: [{ type: "text", text: `# ${page.title}\n${page.url}\n\n${page.text}` }] };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[synthesis-mcp] ready on stdio — tools: web_search, fetch_page");
}

main().catch((error) => {
  console.error("[synthesis-mcp] fatal:", error);
  process.exit(1);
});
