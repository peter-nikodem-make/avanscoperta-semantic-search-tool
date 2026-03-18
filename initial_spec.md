Semantic Search Tool
The goal is to be able to index some documents using embedding vectors.
You can use the language of your choice and the libraries better suited for your language.
While writing the application you should also learn the basics of Embedding and Vector search (asking the AI).
For the embedding, start using a local embedding model.
For the storage you can use either a VectorDB or just a file loaded in memory.
The app is cli tool that should do 2 things: 
 1. Index: Process a text and build/update a vector storage for embedding
 2. Query: Accept a natural-language question and return ranked results with PDF filename and page number
Then index a document on something you know about and verify the questions and answers.


Nice to have:
* Parse all files in a folder and refer to the file in the answer
* Be able to also parse PDFs and refers to the page of text in the answer
* Use HDE questions in embedding
Second part
* Build a MCP server to allow models to search inside it