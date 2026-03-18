export interface Chunk {
  text: string;
  index: number;
  source: string;
  page?: number;
}

export interface ChunkOptions {
  maxChunkSize?: number;
  overlap?: number;
}

const DEFAULT_MAX_CHUNK_SIZE = 500;
const DEFAULT_OVERLAP = 50;

function splitIntoSections(text: string): string[] {
  return text
    .split(/(?=^#{1,6}\s)/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitOversizedSection(
  section: string,
  maxChunkSize: number,
  overlap: number,
): string[] {
  const paragraphs = section
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const wouldBe = current ? `${current}\n\n${para}` : para;

    if (wouldBe.length > maxChunkSize && current.length > 0) {
      chunks.push(current);
      const overlapText = current.slice(-overlap);
      current = `${overlapText}\n\n${para}`;
    } else {
      current = wouldBe;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

export function chunkText(
  text: string,
  source: string,
  options: ChunkOptions = {},
  page?: number,
): Chunk[] {
  const maxChunkSize = options.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;

  const sections = splitIntoSections(text);
  if (sections.length === 0) return [];

  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const parts =
      section.length <= maxChunkSize
        ? [section]
        : splitOversizedSection(section, maxChunkSize, overlap);

    for (const part of parts) {
      chunks.push({
        text: part,
        index: chunkIndex++,
        source,
        ...(page !== undefined && { page }),
      });
    }
  }

  return chunks;
}
