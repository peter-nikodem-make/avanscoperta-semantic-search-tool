import { Command } from "commander";
import { indexFile } from "./indexer.js";
import { searchQuery, formatResults } from "./searcher.js";

const program = new Command();

program
  .name("semantic-search")
  .description("A CLI tool for semantic search over documents")
  .version("0.1.0");

program
  .command("index")
  .description("Index a document for semantic search")
  .argument("<file>", "path to the file to index")
  .option("-s, --store <path>", "path to the index store", "./search-index.json")
  .action(async (file: string, options: { store: string }) => {
    console.log(`Indexing: ${file}`);
    const result = await indexFile(file, { storePath: options.store });
    console.log(`Done. Indexed ${result.chunksIndexed} chunks → ${options.store}`);
  });

program
  .command("query")
  .description("Search indexed documents with a natural-language question")
  .argument("<question>", "the question to search for")
  .option("-s, --store <path>", "path to the index store", "./search-index.json")
  .option("-k, --top-k <number>", "number of results to return", "5")
  .action(async (question: string, options: { store: string; topK: string }) => {
    const result = await searchQuery(question, {
      storePath: options.store,
      topK: parseInt(options.topK, 10),
    });
    console.log(formatResults(result));
  });

program.parse();
