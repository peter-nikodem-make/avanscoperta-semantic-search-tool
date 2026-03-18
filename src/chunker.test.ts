import { describe, it, expect } from "vitest";
import { chunk } from "./chunker.js";

// Helper: generate a paragraph with N words
function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
}

describe("chunk()", () => {
  it("returns an empty array for empty text", () => {
    expect(chunk("", "test.txt")).toEqual([]);
    expect(chunk("   \n\n   ", "test.txt")).toEqual([]);
  });

  it("returns a single chunk when the text is shorter than maxWords", () => {
    const text = "This is a short paragraph with just a few words.";
    const result = chunk(text, "short.txt", { maxWords: 100 });

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(text);
    expect(result[0].index).toBe(0);
    expect(result[0].source).toBe("short.txt");
  });

  it("splits text into multiple chunks when it exceeds maxWords", () => {
    // 3 paragraphs of 100 words each = 300 words total
    const text = [words(100), words(100), words(100)].join("\n\n");
    const result = chunk(text, "multi.txt", {
      maxWords: 150,
      overlapWords: 20,
    });

    // Should produce at least 2 chunks
    expect(result.length).toBeGreaterThanOrEqual(2);
    // Every chunk should be within the word limit (allowing small tolerance for overlap carry)
    for (const c of result) {
      expect(c.text.split(/\s+/).length).toBeLessThanOrEqual(170); // 150 + 20 overlap tolerance
    }
  });

  it("consecutive chunks share overlapping text", () => {
    // 2 paragraphs of 80 words each
    const text = [words(80), words(80)].join("\n\n");
    const result = chunk(text, "overlap.txt", {
      maxWords: 100,
      overlapWords: 20,
    });

    expect(result.length).toBeGreaterThanOrEqual(2);

    // The tail of chunk 0 should appear at the start of chunk 1
    const chunk0Words = result[0].text.split(/\s+/);
    const chunk1Words = result[1].text.split(/\s+/);
    const tail = chunk0Words.slice(-20).join(" ");
    const head = chunk1Words.slice(0, 20).join(" ");

    expect(head).toBe(tail);
  });

  it("assigns correct metadata to each chunk", () => {
    const text = [words(60), words(60), words(60)].join("\n\n");
    const result = chunk(text, "meta.txt", {
      maxWords: 80,
      overlapWords: 10,
    });

    result.forEach((c, i) => {
      expect(c.index).toBe(i);
      expect(c.source).toBe("meta.txt");
      expect(c.text.length).toBeGreaterThan(0);
    });
  });

  it("handles a single very long paragraph by splitting it", () => {
    // One paragraph of 500 words with no double-newline breaks
    const text = words(500);
    const result = chunk(text, "long.txt", {
      maxWords: 200,
      overlapWords: 30,
    });

    expect(result.length).toBeGreaterThanOrEqual(2);
    // No chunk should wildly exceed maxWords
    for (const c of result) {
      expect(c.text.split(/\s+/).length).toBeLessThanOrEqual(230);
    }
  });

  it("with zero overlap, chunks do not share text", () => {
    const text = [words(60), words(60)].join("\n\n");
    const result = chunk(text, "no-overlap.txt", {
      maxWords: 80,
      overlapWords: 0,
    });

    expect(result.length).toBeGreaterThanOrEqual(2);
    // With no overlap, the start of chunk 1 should NOT be the tail of chunk 0
    const chunk0Words = result[0].text.split(/\s+/);
    const chunk1Words = result[1].text.split(/\s+/);
    const lastWordChunk0 = chunk0Words[chunk0Words.length - 1];
    const firstWordChunk1 = chunk1Words[0];
    expect(firstWordChunk1).not.toBe(lastWordChunk0);
  });

  it("uses default options when none are provided", () => {
    // 600 words → should produce multiple chunks with defaults (maxWords=300, overlap=50)
    const text = [words(200), words(200), words(200)].join("\n\n");
    const result = chunk(text, "defaults.txt");

    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});
