import { existsSync } from "node:fs";
import { embed } from "./embeddings.js";
import { VectorStore, type SearchResult } from "./store.js";

const DEFAULT_RELEVANCE_THRESHOLD = 0.3;

export interface QueryOptions {
  storePath: string;
  topK: number;
  threshold?: number;
}

export interface QueryResult {
  results: SearchResult[];
  hasRelevantResults: boolean;
}

export async function searchQuery(
  question: string,
  options: QueryOptions,
): Promise<QueryResult> {
  const { storePath, topK, threshold = DEFAULT_RELEVANCE_THRESHOLD } = options;

  if (!existsSync(storePath)) {
    throw new Error(
      `Index store not found at ${storePath}. Run the "index" command first.`,
    );
  }

  const store = new VectorStore();
  await store.load(storePath);

  const queryVector = await embed(question);
  const results = store.search(queryVector, topK);

  const hasRelevantResults =
    results.length > 0 && results[0].score >= threshold;

  return { results, hasRelevantResults };
}

export function formatResults(queryResult: QueryResult): string {
  const { results, hasRelevantResults } = queryResult;
  const lines: string[] = [];

  if (!hasRelevantResults) {
    lines.push("No relevant results found.\n");
  }

  results.forEach((r, i) => {
    const snippet =
      r.text.length > 200 ? r.text.slice(0, 200) + "..." : r.text;
    const location = r.page !== undefined
      ? `${r.source} (page ${r.page})`
      : `${r.source} (chunk ${r.chunkIndex})`;

    lines.push(`  #${i + 1}  [${r.score.toFixed(4)}]  ${location}`);
    lines.push(`       ${snippet}`);
    lines.push("");
  });

  return lines.join("\n");
}
