import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

let extractor: FeatureExtractionPipeline | null = null;

/**
 * Get or create the singleton embedding pipeline.
 * The model is downloaded on first use and cached locally.
 */
async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", MODEL_NAME, {
      // Use the default ONNX runtime (runs locally, no API keys)
    });
  }
  return extractor;
}

/**
 * Convert a text string into a 384-dimensional embedding vector.
 *
 * Uses the all-MiniLM-L6-v2 sentence-transformer model running locally
 * via ONNX. The result captures the semantic meaning of the input text —
 * similar texts produce similar vectors.
 */
export async function embed(text: string): Promise<number[]> {
  const ext = await getExtractor();
  const output = await ext(text, { pooling: "mean", normalize: true });
  // output is a Tensor — convert to a plain number array
  return Array.from(output.data as Float32Array);
}

/**
 * Compute the cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}
