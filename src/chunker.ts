/**
 * A single chunk of text with its metadata.
 */
export interface Chunk {
  /** The text content of this chunk */
  text: string;
  /** Zero-based index of this chunk within the source */
  index: number;
  /** Identifier for the source document (e.g. filename) */
  source: string;
}

export interface ChunkOptions {
  /** Target maximum number of words per chunk (default: 300) */
  maxWords?: number;
  /** Number of overlapping words between consecutive chunks (default: 50) */
  overlapWords?: number;
}

const DEFAULT_MAX_WORDS = 300;
const DEFAULT_OVERLAP_WORDS = 50;

/**
 * Split text into overlapping chunks, preferring paragraph boundaries.
 *
 * Strategy:
 * 1. Split text into paragraphs (double newline separated).
 * 2. Accumulate paragraphs into a chunk until adding the next paragraph
 *    would exceed `maxWords`.
 * 3. When a chunk is full, emit it and start the next chunk with an overlap
 *    taken from the end of the previous chunk.
 * 4. If a single paragraph exceeds `maxWords`, split it on sentence/word
 *    boundaries so every chunk stays within the limit.
 */
export function chunk(
  text: string,
  source: string,
  options: ChunkOptions = {},
): Chunk[] {
  const maxWords = options.maxWords ?? DEFAULT_MAX_WORDS;
  const overlapWords = options.overlapWords ?? DEFAULT_OVERLAP_WORDS;

  // Split into paragraphs, drop empty ones
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: Chunk[] = [];
  let currentWords: string[] = [];

  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/);

    // If adding this paragraph fits within maxWords, accumulate it
    if (currentWords.length + paraWords.length <= maxWords) {
      currentWords.push(...paraWords);
      continue;
    }

    // If we already have accumulated words, emit the current chunk
    if (currentWords.length > 0) {
      chunks.push({
        text: currentWords.join(" "),
        index: chunks.length,
        source,
      });

      // Start next chunk with overlap from the tail of the previous chunk
      currentWords = getOverlap(currentWords, overlapWords);
    }

    // If the paragraph itself exceeds maxWords, split it into pieces
    if (paraWords.length > maxWords) {
      const pieces = splitLongParagraph(paraWords, maxWords, overlapWords);
      for (const piece of pieces) {
        // Append overlap carry-over words to the first piece
        if (currentWords.length > 0 && pieces.indexOf(piece) === 0) {
          const combined = [...currentWords, ...piece];
          if (combined.length <= maxWords) {
            currentWords = combined;
            continue;
          }
          // Emit carry-over first if combined is too big
          chunks.push({
            text: currentWords.join(" "),
            index: chunks.length,
            source,
          });
          currentWords = getOverlap(currentWords, overlapWords);
        }

        currentWords.push(...piece);

        if (currentWords.length >= maxWords) {
          chunks.push({
            text: currentWords.join(" "),
            index: chunks.length,
            source,
          });
          currentWords = getOverlap(currentWords, overlapWords);
        }
      }
    } else {
      // Normal-sized paragraph — start accumulating it
      currentWords.push(...paraWords);
    }
  }

  // Emit any remaining words as the final chunk
  if (currentWords.length > 0) {
    chunks.push({
      text: currentWords.join(" "),
      index: chunks.length,
      source,
    });
  }

  return chunks;
}

/**
 * Extract the last `count` words from a word array for overlap.
 */
function getOverlap(words: string[], count: number): string[] {
  if (count <= 0) return [];
  return words.slice(-Math.min(count, words.length));
}

/**
 * Split a long paragraph (already tokenised into words) into pieces
 * of at most `maxWords` words each.
 */
function splitLongParagraph(
  words: string[],
  maxWords: number,
  _overlapWords: number,
): string[][] {
  const pieces: string[][] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    pieces.push(words.slice(i, i + maxWords));
  }
  return pieces;
}
