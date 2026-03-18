import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, unlink } from "node:fs/promises";
import { indexFile } from "./indexer.js";
import { searchQuery, formatResults } from "./searcher.js";

const TMP_INPUT = "/tmp/test-search-input.txt";
const TMP_STORE = "/tmp/test-search-store.json";

const SAMPLE_TEXT = [
  "Cats are beloved household pets known for their independence and agility.",
  "The stock market experienced significant volatility during the third quarter.",
  "Quantum computing promises to revolutionize cryptography and drug discovery.",
].join("\n\n");

describe("searchQuery", () => {
  beforeAll(async () => {
    await writeFile(TMP_INPUT, SAMPLE_TEXT, "utf-8");
    await indexFile(TMP_INPUT, {
      storePath: TMP_STORE,
      chunkOptions: { maxChunkSize: 80, overlap: 2 },
    });
  }, 60_000);

  afterAll(async () => {
    for (const f of [TMP_INPUT, TMP_STORE]) {
      try { await unlink(f); } catch { /* ignore */ }
    }
  });

  it("returns ranked results for a relevant query", async () => {
    const result = await searchQuery("Tell me about cats", {
      storePath: TMP_STORE,
      topK: 3,
    });
    expect(result.results).toHaveLength(3);
    expect(result.results[0].text).toContain("Cats");
    expect(result.results[0].score).toBeGreaterThan(result.results[1].score);
    expect(result.hasRelevantResults).toBe(true);
  }, 30_000);

  it("throws when store does not exist", async () => {
    await expect(
      searchQuery("anything", { storePath: "/tmp/no-such-store.json", topK: 5 }),
    ).rejects.toThrow("Index store not found");
  });
});

describe("formatResults", () => {
  it("formats results with scores and snippets", () => {
    const output = formatResults({
      hasRelevantResults: true,
      results: [
        { text: "Some result text", source: "doc.txt", chunkIndex: 0, score: 0.85 },
      ],
    });
    expect(output).toContain("#1");
    expect(output).toContain("0.8500");
    expect(output).toContain("doc.txt");
    expect(output).toContain("Some result text");
  });

  it("shows warning when no relevant results", () => {
    const output = formatResults({
      hasRelevantResults: false,
      results: [
        { text: "Low score", source: "a.txt", chunkIndex: 0, score: 0.1 },
      ],
    });
    expect(output).toContain("No relevant results found");
  });
});
