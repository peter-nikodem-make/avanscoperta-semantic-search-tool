---
name: Semantic Search Tool — Full Build Plan
overview: Build a CLI-based semantic search tool in TypeScript that indexes documents using embedding vectors and allows natural-language querying. Built iteratively in 9 steps.
todos:
  - id: step-1
    content: "Step 1 — Project Skeleton: package.json, tsconfig.json, CLI entrypoint with stubs"
    status: completed
  - id: step-2
    content: "Step 2 — Embeddings: integrate @huggingface/transformers, embed() function, unit test"
    status: completed
  - id: step-3
    content: "Step 3 — Chunking: paragraph-based chunking with overlap, unit tests"
    status: completed
  - id: step-4
    content: "Step 4 — Vector Store: in-memory store with cosine similarity search, persistence, unit tests"
    status: pending
  - id: step-5
    content: "Step 5 — Indexing Pipeline: wire index command end-to-end (read → chunk → embed → store)"
    status: pending
  - id: step-6
    content: "Step 6 — Query Pipeline: wire query command (load → embed → search → display results)"
    status: pending
  - id: step-7
    content: "Step 7 — End-to-End Validation: test document, automated e2e tests at 3 difficulty levels"
    status: pending
  - id: step-8
    content: "Step 8 — PDF Support: PDF parsing, page-level chunking, file type detection"
    status: pending
  - id: step-9
    content: "Step 9 — Polish: colored output, error handling, help text, README"
    status: pending
isProject: true
---

# Semantic Search Tool — Full Build Plan

## Goal

A CLI tool that indexes documents using embedding vectors and allows natural-language querying. It should understand meaning, not just keywords.

## Architecture

```
INDEXING PIPELINE
─────────────────
  Document (.txt / .pdf)
       │
       ▼
  [ Chunking ]  →  Split into smaller text pieces
       │
       ▼
  [ Embedding ]  →  Convert each chunk to a vector (number[])
       │
       ▼
  [ Storage ]  →  Save vectors + metadata to a JSON file


QUERY PIPELINE
──────────────
  User question (string)
       │
       ▼
  [ Embedding ]  →  Convert question to a vector
       │
       ▼
  [ Similarity Search ]  →  Compare against all stored vectors
       │
       ▼
  [ Ranking ]  →  Sort by cosine similarity, return top-k
       │
       ▼
  Ranked results (filename, page, score, text snippet)
```

## Technical Stack


| Concern         | Choice                                              | Why                                               |
| --------------- | --------------------------------------------------- | ------------------------------------------------- |
| Language        | TypeScript on Node.js                               | Strong typing, structured project                 |
| Embedding model | `@huggingface/transformers` with `all-MiniLM-L6-v2` | Runs ONNX models locally, no API keys, no network |
| CLI framework   | `commander`                                         | Lightweight, well-typed, subcommand support       |
| Vector storage  | JSON file loaded in memory                          | Simple, no database dependency                    |
| PDF parsing     | `pdf-parse` or `pdfjs-dist`                         | Extract text and page boundaries                  |
| Runtime         | `tsx`                                               | Run TypeScript directly, no compile step          |
| Testing         | `vitest`                                            | Fast, TypeScript-native                           |


---

## Step 1 — Project Skeleton (COMPLETED)

### What We Built

A minimal but fully runnable CLI tool with two subcommands (`index` and `query`) that print stub messages.

### Files Created

- `package.json` — dependencies: `commander`, dev: `typescript`, `tsx`, `vitest`, `@types/node`
- `tsconfig.json` — ESNext/NodeNext, strict mode
- `.gitignore` — excludes `node_modules/`, `dist/`, `search-index.json`
- `src/cli.ts` — CLI entrypoint with `index <file>` and `query <question>` stubs

### Key Decisions

- `**@huggingface/transformers**` (not `@xenova/transformers`): The original package was migrated to HuggingFace's org as v3+. It is actively maintained and the recommended choice going forward.
- `**commander**` for CLI: lightweight, well-typed, supports subcommands natively.
- `**tsx**` for running TypeScript directly during development (no compile step needed).
- `**vitest**` for testing: fast, TypeScript-native, compatible with the Node ecosystem.

### Verification (all passing)

- `npx tsx src/cli.ts --help` — shows tool name, version, and subcommands
- `npx tsx src/cli.ts index --help` — shows index command usage
- `npx tsx src/cli.ts query --help` — shows query command usage
- `npx tsx src/cli.ts index myfile.txt` — prints stub message
- `npx tsx src/cli.ts query "what is this about?"` — prints stub message

---

## Step 2 — Embeddings

### What We're Building

Integrate a local embedding model so we can convert text into numerical vectors.

### Key Concepts to Learn

- **What are embeddings?** Converting text into a list of numbers (a vector) where similar meanings produce similar vectors.
- **What does `all-MiniLM-L6-v2` do?** It's a sentence-transformer model (~22M params) that maps any text to a 384-dimensional vector.
- **What do the 384 dimensions represent?** Learned abstract features — no single dimension means "topic" or "sentiment", but together they capture semantic meaning.

### Tasks

- Install `@huggingface/transformers`
- Create `src/embeddings.ts`: a function `embed(text: string): Promise<number[]>` that loads `all-MiniLM-L6-v2` and returns a 384-dim vector
- Write a unit test (`src/embeddings.test.ts`) that:
  - Embeds two similar sentences (e.g., "The cat sat on the mat" / "A feline rested on the rug")
  - Embeds two unrelated sentences (e.g., "The cat sat on the mat" / "Stock markets rose sharply today")
  - Asserts the similar pair has higher cosine similarity than the unrelated pair

### Files

- `src/embeddings.ts` — embed function with model singleton
- `src/embeddings.test.ts` — similarity comparison test

---

## Step 3 — Chunking

### What We're Building

A text splitter that breaks documents into smaller, overlapping pieces suitable for embedding.

### Key Concepts to Learn

- **Why chunk?** Long texts lose specificity when embedded as a single vector — the meaning gets averaged out.
- **Why overlap?** Information at chunk boundaries would be split and lost. Overlap ensures continuity.
- **How does chunk size affect quality?** Too large = vague vectors; too small = missing context. 200-500 words is a good starting range.

### Tasks

- Create `src/chunker.ts`: a function that takes a string and returns an array of chunks with metadata
- Implement paragraph-based chunking with configurable overlap (default: ~50 words)
- Each chunk includes: `{ text, index, source }` metadata
- Write unit tests (`src/chunker.test.ts`):
  - Verify chunk count for a known input
  - Verify overlap behavior (consecutive chunks share text)
  - Verify metadata correctness

### Files

- `src/chunker.ts` — chunking logic
- `src/chunker.test.ts` — unit tests

---

## Step 4 — Vector Store

### What We're Building

An in-memory data store that holds embedding vectors alongside their metadata, supports cosine similarity search, and persists to disk as JSON.

### Key Concepts to Learn

- **Cosine similarity**: measures the angle between two vectors. Formula: `(A · B) / (|A| × |B|)`. Result: 1.0 = identical, 0.0 = unrelated, -1.0 = opposite.
- **Why cosine over Euclidean?** Cosine is magnitude-independent — it measures direction (meaning) not length.

### Tasks

- Create `src/store.ts` with:
  - `add(entries)` — add vector + metadata entries
  - `search(queryVector, topK)` — cosine similarity search, returns sorted results
  - `save(filePath)` — persist to JSON
  - `load(filePath)` — load from JSON
  - Incremental updates: re-adding a source replaces its existing entries (no duplicates)
- Write unit tests (`src/store.test.ts`):
  - Add entries with hand-crafted vectors, verify search ranking
  - Verify save/load round-trip
  - Verify incremental update (re-index replaces, doesn't duplicate)

### Files

- `src/store.ts` — VectorStore class
- `src/store.test.ts` — unit tests

---

## Step 5 — Indexing Pipeline

### What We're Building

Wire the `index` CLI command end-to-end: read a text file, chunk it, embed each chunk, store vectors, persist to disk.

### Tasks

- Create `src/indexer.ts`: orchestration function that takes a file path and store path, runs the full pipeline
- Update `src/cli.ts`: replace the index stub with a real call to the indexer
- The command accepts a file path and optional `--store` path (default: `./search-index.json`)
- Write an integration test (`src/indexer.test.ts`):
  - Index a small test .txt file
  - Verify the JSON store file is created
  - Verify it contains the expected number of entries with correct metadata

### Files

- `src/indexer.ts` — indexing pipeline
- `src/indexer.test.ts` — integration test
- `src/cli.ts` — updated index command

---

## Step 6 — Query Pipeline

### What We're Building

Wire the `query` CLI command: load the store, embed the question, search, display ranked results.

### Tasks

- Create `src/searcher.ts`: orchestration function that loads store, embeds query, searches, returns results
- Update `src/cli.ts`: replace the query stub with a real call to the searcher
- Display results with: rank, score, source file, section/page number, text snippet (truncated ~200 chars)
- Establish a relevance threshold — if the top score is below it, warn "no relevant results found"
- Write a test (`src/searcher.test.ts`) that verifies result format and ranking

### Files

- `src/searcher.ts` — query pipeline
- `src/searcher.test.ts` — test
- `src/cli.ts` — updated query command

---

## Step 7 — End-to-End Validation

### What We're Building

A test document on a known topic and automated e2e tests that verify the full system produces semantically correct results.

### Tasks

- Create `test-data/coffee.txt` with 4-5 clearly distinct sections:
  - Espresso, Cappuccino, Caffè Americano, Moka Pot (and optionally more)
- Build `test/e2e.test.ts` that:
  1. Indexes the test document programmatically
  2. Runs queries at three difficulty levels:
    - **Easy** (keyword overlap): "What is espresso?" → expects espresso section
    - **Medium** (paraphrase): "Which coffee drink was popular with American soldiers?" → expects Americano
    - **Hard** (conceptual): "How do Italians make coffee at home?" → expects Moka pot
    - **Negative** (not in doc): "How do you roast coffee beans?" → expects low scores
  3. Asserts the top result's text contains the expected content
- Use results to tune chunk size, overlap, and relevance threshold

### Files

- `test-data/coffee.txt` — test document
- `test/e2e.test.ts` — automated validation

---

## Step 8 — PDF Support

### What We're Building

PDF parsing so the tool can index PDF files and track page numbers in the results.

### Tasks

- Install PDF parsing library (`pdf-parse` or `pdfjs-dist`)
- Create `src/pdf-reader.ts`: extract text from a PDF, returning `{ text, page }[]`
- Update `src/indexer.ts` to detect file type by extension and use the appropriate reader
- Each chunk's metadata includes the page number for PDF sources
- Test with a real PDF document

### Files

- `src/pdf-reader.ts` — PDF text extraction
- `src/indexer.ts` — updated with file type detection
- `src/pdf-reader.test.ts` — test with a sample PDF

---

## Step 9 — Polish

### What We're Building

Production-quality CLI experience with proper error handling and documentation.

### Tasks

- Better CLI output: colored output (e.g., `chalk` or `picocolors`), progress indicators during indexing
- Proper error handling: missing files, corrupt PDFs, empty documents, missing store file on query
- `--help` text for all commands with usage examples
- A README with:
  - Setup instructions (clone, install, build)
  - Usage examples (index a file, query)
  - Brief explanation of how semantic search works
  - Dependencies and requirements

### Files

- `src/cli.ts` — enhanced output and error handling
- `README.md` — project documentation

