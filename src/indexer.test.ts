import { describe, it, expect, afterEach } from "vitest";
import { writeFile, unlink, readFile } from "node:fs/promises";
import { indexFile } from "./indexer.js";
import { VectorStore } from "./store.js";

const TMP_INPUT = "/tmp/test-input.txt";
const TMP_STORE = "/tmp/test-index-store.json";

const SAMPLE_TEXT = [
  "The sun rose slowly over the mountains, casting long shadows across the valley.",
  "A gentle breeze carried the scent of wildflowers through the meadow.",
  "Birds began to sing their morning songs from the treetops.",
].join("\n\n");

describe("indexFile", () => {
  afterEach(async () => {
    for (const f of [TMP_INPUT, TMP_STORE]) {
      try { await unlink(f); } catch { /* ignore */ }
    }
  });

  it("indexes a text file and creates a store", async () => {
    await writeFile(TMP_INPUT, SAMPLE_TEXT, "utf-8");
    const result = await indexFile(TMP_INPUT, { storePath: TMP_STORE });

    expect(result.chunksIndexed).toBeGreaterThan(0);

    const store = new VectorStore();
    await store.load(TMP_STORE);
    expect(store.size()).toBe(result.chunksIndexed);
  }, 60_000);

  it("stores correct metadata", async () => {
    await writeFile(TMP_INPUT, SAMPLE_TEXT, "utf-8");
    await indexFile(TMP_INPUT, { storePath: TMP_STORE });

    const raw = JSON.parse(await readFile(TMP_STORE, "utf-8"));
    expect(raw[0].source).toBe("test-input.txt");
    expect(typeof raw[0].chunkIndex).toBe("number");
    expect(typeof raw[0].text).toBe("string");
    expect(Array.isArray(raw[0].vector)).toBe(true);
    expect(raw[0].vector).toHaveLength(384);
  }, 60_000);

  it("replaces entries on re-index of the same file", async () => {
    await writeFile(TMP_INPUT, "First version of content.", "utf-8");
    await indexFile(TMP_INPUT, { storePath: TMP_STORE });

    await writeFile(TMP_INPUT, "Second version of content.", "utf-8");
    await indexFile(TMP_INPUT, { storePath: TMP_STORE });

    const store = new VectorStore();
    await store.load(TMP_STORE);
    expect(store.size()).toBe(1);
  }, 60_000);
});
