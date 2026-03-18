import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { indexFile } from "../src/indexer.js";
import { searchQuery } from "../src/searcher.js";

const COFFEE_FILE = resolve(__dirname, "../test-data/coffee.txt");
const STORE_PATH = "/tmp/e2e-test-store.json";

describe("end-to-end semantic search", () => {
  beforeAll(async () => {
    await indexFile(COFFEE_FILE, {
      storePath: STORE_PATH,
      chunkOptions: { maxChunkSize: 600, overlap: 20 },
    });
  }, 120_000);

  afterAll(async () => {
    try { await unlink(STORE_PATH); } catch { /* ignore */ }
  });

  it("easy: 'What is espresso?' returns the espresso section", async () => {
    const { results } = await searchQuery("What is espresso?", {
      storePath: STORE_PATH,
      topK: 3,
    });
    expect(results[0].text.toLowerCase()).toContain("espresso");
    expect(results[0].score).toBeGreaterThan(0.4);
  }, 30_000);

  it("medium: 'Which coffee drink was popular with American soldiers?' returns Americano", async () => {
    const { results } = await searchQuery(
      "Which coffee drink was popular with American soldiers?",
      { storePath: STORE_PATH, topK: 3 },
    );
    expect(results[0].text.toLowerCase()).toContain("americano");
    expect(results[0].score).toBeGreaterThan(0.3);
  }, 30_000);

  it("hard: 'How do Italians make coffee at home?' returns Moka pot", async () => {
    const { results } = await searchQuery(
      "How do Italians make coffee at home?",
      { storePath: STORE_PATH, topK: 3 },
    );
    expect(results[0].text.toLowerCase()).toContain("moka");
    expect(results[0].score).toBeGreaterThan(0.3);
  }, 30_000);

  it("negative: 'How do you roast coffee beans?' has low top score", async () => {
    const { results, hasRelevantResults } = await searchQuery(
      "How do you roast coffee beans?",
      { storePath: STORE_PATH, topK: 3, threshold: 0.5 },
    );
    expect(results[0].score).toBeLessThan(0.6);
  }, 30_000);
});
