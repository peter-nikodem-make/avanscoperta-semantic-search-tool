import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { chunkText, type ChunkOptions } from "./chunker.js";
import { embed } from "./embeddings.js";
import { VectorStore, type StoreEntry } from "./store.js";

export interface IndexOptions {
  storePath: string;
  chunkOptions?: ChunkOptions;
}

export async function indexFile(
  filePath: string,
  options: IndexOptions,
): Promise<{ chunksIndexed: number }> {
  const { storePath, chunkOptions } = options;

  const source = basename(filePath);
  const content = await readFile(filePath, "utf-8");
  const chunks = chunkText(content, source, chunkOptions);

  if (chunks.length === 0) {
    throw new Error(`No content to index in ${filePath}`);
  }

  const entries: StoreEntry[] = [];
  for (const chunk of chunks) {
    const vector = await embed(chunk.text);
    entries.push({
      vector,
      text: chunk.text,
      source: chunk.source,
      chunkIndex: chunk.index,
      page: chunk.page,
    });
  }

  const store = new VectorStore();
  if (existsSync(storePath)) {
    await store.load(storePath);
  }

  store.add(entries);
  await store.save(storePath);

  return { chunksIndexed: chunks.length };
}
