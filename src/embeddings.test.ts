import { describe, it, expect } from "vitest";
import { embed, cosineSimilarity } from "./embeddings.js";

describe("embed", () => {
  it("returns a 384-dimensional vector", async () => {
    const vector = await embed("Hello world");
    expect(vector).toHaveLength(384);
    expect(vector.every((v) => typeof v === "number")).toBe(true);
  }, 30_000);

  it("produces higher similarity for semantically similar sentences", async () => {
    const catMat = await embed("The cat sat on the mat");
    const felineRug = await embed("A feline rested on the rug");
    const stockMarket = await embed("Stock markets rose sharply today");

    const similarScore = cosineSimilarity(catMat, felineRug);
    const unrelatedScore = cosineSimilarity(catMat, stockMarket);

    expect(similarScore).toBeGreaterThan(unrelatedScore);
    expect(similarScore).toBeGreaterThan(0.5);
    expect(unrelatedScore).toBeLessThan(0.5);
  }, 30_000);
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);
  });
});
