import { Command } from "commander";

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
  .action((file: string, options: { store: string }) => {
    console.log(`[stub] Indexing file: ${file}`);
    console.log(`[stub] Store path: ${options.store}`);
  });

program
  .command("query")
  .description("Search indexed documents with a natural-language question")
  .argument("<question>", "the question to search for")
  .option("-s, --store <path>", "path to the index store", "./search-index.json")
  .option("-k, --top-k <number>", "number of results to return", "5")
  .action((question: string, options: { store: string; topK: string }) => {
    console.log(`[stub] Searching for: ${question}`);
    console.log(`[stub] Store: ${options.store}, Top-K: ${options.topK}`);
  });

program.parse();
