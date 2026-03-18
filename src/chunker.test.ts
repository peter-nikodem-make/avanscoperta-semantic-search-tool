import { describe, it, expect } from "vitest";
import { chunkText } from "./chunker.js";

const MULTI_PARAGRAPH = [
  "First paragraph with some content about cats and dogs.",
  "Second paragraph discussing the weather and climate change.",
  "Third paragraph about technology and artificial intelligence.",
  "Fourth paragraph covering sports and athletics events.",
  "Fifth paragraph on cooking recipes and kitchen tips.",
].join("\n\n");

describe("chunkText", () => {
  it("returns an empty array for empty input", () => {
    expect(chunkText("", "test.txt")).toEqual([]);
    expect(chunkText("   \n\n   ", "test.txt")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const chunks = chunkText("A short paragraph.", "test.txt");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("A short paragraph.");
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].source).toBe("test.txt");
  });

  it("splits into multiple chunks when text exceeds maxChunkSize", () => {
    const chunks = chunkText(MULTI_PARAGRAPH, "doc.txt", {
      maxChunkSize: 120,
      overlap: 3,
    });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
      expect(chunk.source).toBe("doc.txt");
      expect(chunk.text.length).toBeGreaterThan(0);
    });
  });

  it("produces overlapping content between consecutive chunks", () => {
    const overlapChars = 30;
    const chunks = chunkText(MULTI_PARAGRAPH, "doc.txt", {
      maxChunkSize: 120,
      overlap: overlapChars,
    });
    if (chunks.length >= 2) {
      const tail = chunks[0].text.slice(-overlapChars);
      expect(chunks[1].text).toContain(tail);
    }
  });

  it("includes page metadata when provided", () => {
    const chunks = chunkText("Some text on page 3.", "report.pdf", {}, 3);
    expect(chunks[0].page).toBe(3);
  });

  it("omits page field when not provided", () => {
    const chunks = chunkText("Some text.", "notes.txt");
    expect(chunks[0]).not.toHaveProperty("page");
  });

  it("assigns sequential indices", () => {
    const chunks = chunkText(MULTI_PARAGRAPH, "doc.txt", {
      maxChunkSize: 100,
      overlap: 2,
    });
    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
    });
  });
});
