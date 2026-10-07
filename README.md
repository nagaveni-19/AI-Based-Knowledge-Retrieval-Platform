# Insight Navigator

Understand and classify user queries as factual, procedural, comparative, or ambiguous.

Retrieve relevant information from the knowledge base using semantic/vector search.

Generate accurate answers using only the retrieved information.

Show source documents, relevant chunks, and confidence/relevance scores.

Ask clarification questions when the user's query is incomplete or ambiguous.

Maintain conversation memory so follow-up questions can understand previous context.

Support voice input using Speech-to-Text and read answers aloud using Text-to-Speech.

Connect all agents through an automatic orchestration flow: User Query → Query Understanding → Clarification (if needed) → Retrieval → Response Generation → Final Response

Handle errors such as no results, low-confidence results, unclear queries, and failed responses.

Provide a simple and user-friendly interface with transparent sources for every generated answer

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://quest-compass-93.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5f041999-1cc0-4291-8e5d-265e5a0d5620).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
