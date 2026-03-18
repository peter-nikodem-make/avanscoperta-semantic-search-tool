import { readFile, writeFile } from "node:fs/promises";
import { cosineSimilarity } from "./embeddings.js";

export interface StoreEntry {
  vector: number[];
  text: string;
  source: string;
  chunkIndex: number;
  page?: number;
}

export interface SearchResult {
  text: string;
  source: string;
  chunkIndex: number;
  page?: number;
  score: number;
}

export class VectorStore {
  private entries: StoreEntry[] = [];

  add(newEntries: StoreEntry[]): void {
    if (newEntries.length === 0) return;

    const sources = new Set(newEntries.map((e) => e.source));
    this.entries = this.entries.filter((e) => !sources.has(e.source));
    this.entries.push(...newEntries);
  }

  search(queryVector: number[], topK: number = 5): SearchResult[] {
    return this.entries
      .map((entry) => ({
        text: entry.text,
        source: entry.source,
        chunkIndex: entry.chunkIndex,
        page: entry.page,
        score: cosineSimilarity(queryVector, entry.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  size(): number {
    return this.entries.length;
  }

  async save(filePath: string): Promise<void> {
    const data = JSON.stringify(this.entries);
    await writeFile(filePath, data, "utf-8");
  }

  async load(filePath: string): Promise<void> {
    const data = await readFile(filePath, "utf-8");
    this.entries = JSON.parse(data) as StoreEntry[];
  }
}
