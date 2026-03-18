import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { indexFile } from "./indexer.js";
import { searchQuery } from "./searcher.js";

const DEFAULT_STORE_PATH = resolve(process.cwd(), "search-index.json");

const server = new McpServer({
  name: "semantic-search",
  version: "1.0.0",
});

// ─── Tool: search ───────────────────────────────────────────────────────────
server.tool(
  "semantic_search",
  "Search indexed documents with a natural-language question. Returns ranked results with source file, page number, relevance score, and a text snippet.",
  {
    question: z
      .string()
      .describe("The natural-language question to search for"),
    topK: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(5)
      .describe("Number of results to return (default: 5)"),
    storePath: z
      .string()
      .optional()
      .describe(
        "Path to the index store JSON file. Defaults to ./search-index.json",
      ),
  },
  async ({ question, topK, storePath }) => {
    const resolvedStore = storePath ? resolve(storePath) : DEFAULT_STORE_PATH;

    if (!existsSync(resolvedStore)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Index store not found at ${resolvedStore}. Use the "index_document" tool first.`,
          },
        ],
      };
    }

    const result = await searchQuery(question, {
      storePath: resolvedStore,
      topK,
    });

    if (!result.hasRelevantResults) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No relevant results found for this question. Try rephrasing or index more documents.",
          },
        ],
      };
    }

    const formatted = result.results
      .map((r, i) => {
        const location =
          r.page !== undefined
            ? `${r.source} (page ${r.page})`
            : `${r.source} (chunk ${r.chunkIndex})`;
        const snippet =
          r.text.length > 500 ? r.text.slice(0, 500) + "..." : r.text;
        return `#${i + 1} [score: ${r.score.toFixed(4)}] ${location}\n${snippet}`;
      })
      .join("\n\n");

    return {
      content: [{ type: "text" as const, text: formatted }],
    };
  },
);

// ─── Tool: index_document ───────────────────────────────────────────────────
server.tool(
  "index_document",
  "Index a text file for semantic search. Reads the file, splits it into chunks, embeds each chunk, and stores the vectors for later searching.",
  {
    filePath: z
      .string()
      .describe("Absolute or relative path to the text file to index"),
    storePath: z
      .string()
      .optional()
      .describe(
        "Path to the index store JSON file. Defaults to ./search-index.json",
      ),
  },
  async ({ filePath, storePath }) => {
    const store = storePath ? resolve(storePath) : DEFAULT_STORE_PATH;
    const file = resolve(filePath);

    if (!existsSync(file)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: File not found: ${file}`,
          },
        ],
      };
    }

    try {
      const result = await indexFile(file, { storePath: store });
      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully indexed ${result.chunksIndexed} chunks from ${file} → ${store}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error indexing file: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  },
);

// ─── Tool: list_indexed_sources ─────────────────────────────────────────────
server.tool(
  "list_indexed_sources",
  "List all document sources that have been indexed in the store.",
  {
    storePath: z
      .string()
      .optional()
      .describe(
        "Path to the index store JSON file. Defaults to ./search-index.json",
      ),
  },
  async ({ storePath }) => {
    const resolvedStore = storePath ? resolve(storePath) : DEFAULT_STORE_PATH;

    if (!existsSync(resolvedStore)) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No index store found. No documents have been indexed yet.",
          },
        ],
      };
    }

    const { VectorStore } = await import("./store.js");
    const vs = new VectorStore();
    await vs.load(resolvedStore);

    const sources = vs.getSources();

    if (sources.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "The index store is empty. No documents have been indexed.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Indexed sources (${sources.length}):\n${sources.map((s) => `  • ${s}`).join("\n")}`,
        },
      ],
    };
  },
);

// ─── Start ──────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Semantic Search MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
