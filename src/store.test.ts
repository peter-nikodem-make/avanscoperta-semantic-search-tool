import { describe, it, expect, afterEach } from "vitest";
import { unlink } from "node:fs/promises";
import { VectorStore } from "./store.js";

function entry(source: string, vector: number[], text: string, chunkIndex = 0) {
  return { vector, text, source, chunkIndex };
}

describe("VectorStore", () => {
  const tmpFile = "/tmp/test-store.json";

  afterEach(async () => {
    try { await unlink(tmpFile); } catch { /* ignore */ }
  });

  it("starts empty", () => {
    const store = new VectorStore();
    expect(store.size()).toBe(0);
  });

  it("adds entries and reports correct size", () => {
    const store = new VectorStore();
    store.add([
      entry("a.txt", [1, 0, 0], "first"),
      entry("a.txt", [0, 1, 0], "second"),
    ]);
    expect(store.size()).toBe(2);
  });

  it("searches by cosine similarity and ranks correctly", () => {
    const store = new VectorStore();
    store.add([
      entry("a.txt", [1, 0, 0], "aligned with query", 0),
      entry("b.txt", [0, 1, 0], "orthogonal to query", 0),
      entry("c.txt", [0.9, 0.1, 0], "close to query", 0),
    ]);

    const results = store.search([1, 0, 0], 3);
    expect(results[0].text).toBe("aligned with query");
    expect(results[0].score).toBeCloseTo(1.0);
    expect(results[1].text).toBe("close to query");
    expect(results[2].text).toBe("orthogonal to query");
    expect(results[2].score).toBeCloseTo(0.0);
  });

  it("respects topK limit", () => {
    const store = new VectorStore();
    store.add([
      entry("a.txt", [1, 0], "a"),
      entry("b.txt", [0, 1], "b"),
      entry("c.txt", [1, 1], "c"),
    ]);
    const results = store.search([1, 0], 2);
    expect(results).toHaveLength(2);
  });

  it("replaces entries from the same source on re-add", () => {
    const store = new VectorStore();
    store.add([
      entry("a.txt", [1, 0], "original-a", 0),
      entry("b.txt", [0, 1], "keep-b", 0),
    ]);
    expect(store.size()).toBe(2);

    store.add([entry("a.txt", [1, 1], "updated-a", 0)]);
    expect(store.size()).toBe(2);

    const results = store.search([1, 1], 5);
    const texts = results.map((r) => r.text);
    expect(texts).toContain("updated-a");
    expect(texts).not.toContain("original-a");
    expect(texts).toContain("keep-b");
  });

  it("saves and loads round-trip", async () => {
    const store = new VectorStore();
    store.add([
      entry("a.txt", [1, 0, 0], "hello", 0),
      entry("b.txt", [0, 1, 0], "world", 1),
    ]);
    await store.save(tmpFile);

    const loaded = new VectorStore();
    await loaded.load(tmpFile);
    expect(loaded.size()).toBe(2);

    const results = loaded.search([1, 0, 0], 1);
    expect(results[0].text).toBe("hello");
    expect(results[0].score).toBeCloseTo(1.0);
  });
});
