import { describe, it, expect } from "vitest";
import { embed, cosineSimilarity } from "./embeddings.js";

describe("embed()", () => {
  it("returns a 384-dimensional vector", async () => {
    const vector = await embed("Hello world");
    expect(vector).toHaveLength(384);
    // Every element should be a finite number
    vector.forEach((v) => expect(Number.isFinite(v)).toBe(true));
  }, 60_000); // first call downloads the model — allow generous timeout

  it("similar sentences have higher cosine similarity than unrelated ones", async () => {
    const [catVec, felineVec, stockVec] = await Promise.all([
      embed("The cat sat on the mat"),
      embed("A feline rested on the rug"),
      embed("Stock markets rose sharply today"),
    ]);

    const similarScore = cosineSimilarity(catVec, felineVec);
    const unrelatedScore = cosineSimilarity(catVec, stockVec);

    console.log(`Similar pair score:   ${similarScore.toFixed(4)}`);
    console.log(`Unrelated pair score: ${unrelatedScore.toFixed(4)}`);

    // The semantically similar pair should score higher
    expect(similarScore).toBeGreaterThan(unrelatedScore);
    // And the gap should be meaningful
    expect(similarScore).toBeGreaterThan(0.5);
    expect(unrelatedScore).toBeLessThan(0.5);
  }, 60_000);
});

describe("cosineSimilarity()", () => {
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

  it("throws on length mismatch", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
      "Vector length mismatch",
    );
  });
});
