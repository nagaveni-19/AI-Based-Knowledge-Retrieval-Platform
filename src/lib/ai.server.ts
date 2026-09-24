import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function key() {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new Error("AI is not configured yet.");
  return k;
}

function model() {
  const k = key();
  const lovable = createOpenAI({
    baseURL: GATEWAY,
    apiKey: k,
    headers: { "Lovable-API-Key": k, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  return lovable.responses("openai/gpt-6-astra");
}

const reasoning = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    store: false,
  },
} as const;

/** Embeddings — google/gemini-embedding-2, 3072 dims. */
export async function embed(input: string[]): Promise<number[][]> {
  const res = await fetch(`${GATEWAY}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key()}`,
    },
    body: JSON.stringify({ model: "google/gemini-embedding-2", input }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 402) throw new Error("AI credits are exhausted. Please add credits to continue.");
    if (res.status === 429) throw new Error("Too many requests right now. Please try again in a moment.");
    throw new Error(`Embedding failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export type QueryUnderstanding = {
  type: "factual" | "procedural" | "comparative" | "ambiguous";
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion: string;
  searchQuery: string;
  reasoning: string;
};

const understandingSchema = z.object({
  type: z.enum(["factual", "procedural", "comparative", "ambiguous"]),
  confidence: z.number(),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string(),
  searchQuery: z.string(),
  reasoning: z.string(),
});

/** Query Understanding Agent (+ Clarification Agent decision). */
export async function understandQuery(
  query: string,
  history: { role: string; content: string }[],
  documentNames: string[],
): Promise<QueryUnderstanding> {
  const prompt = [
    `Knowledge base documents: ${documentNames.length ? documentNames.join(", ") : "(none uploaded yet)"}`,
    history.length
      ? `Recent conversation:\n${history.map((m) => `${m.role}: ${m.content}`).join("\n")}`
      : "No previous conversation.",
    `Current user query: "${query}"`,
    "",
    "Classify the query as factual (asks for a fact), procedural (asks how to do something),",
    "comparative (asks to compare two or more things), or ambiguous (unclear terminology, missing",
    "context, several possible interpretations, or too incomplete to search).",
    "Set confidence between 0 and 1.",
    "Set needsClarification to true ONLY when the query genuinely cannot be resolved, even using the",
    "conversation above. Follow-up questions that refer to earlier topics are NOT ambiguous —",
    "resolve their references using the conversation.",
    "clarificationQuestion: one short targeted question when clarification is needed, else empty string.",
    "searchQuery: a self-contained search query with pronouns and references resolved from the conversation.",
    "reasoning: one short sentence explaining the classification.",
  ].join("\n");

  try {
    const result = streamText({
      model: model(),
      output: Output.object({ schema: understandingSchema }),
      system: "You are the Query Understanding Agent of a document knowledge assistant. Be strict and concise.",
      prompt,
      providerOptions: reasoning,
    });
    return (await result.output) as QueryUnderstanding;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      try {
        return understandingSchema.parse(JSON.parse(error.text)) as QueryUnderstanding;
      } catch {
        /* fall through */
      }
    }
    return {
      type: "factual",
      confidence: 0.4,
      needsClarification: false,
      clarificationQuestion: "",
      searchQuery: query,
      reasoning: "Classification unavailable; continued with the original query.",
    };
  }
}

export type RetrievedChunk = {
  id: string;
  document_id: string;
  document_name: string;
  domain: string | null;
  chunk_index: number;
  page: number | null;
  section: string | null;
  content: string;
  similarity: number;
};

/** Response Generation Agent — grounded answer using only retrieved context. */
export async function generateAnswer(
  query: string,
  type: string,
  chunks: RetrievedChunk[],
  history: { role: string; content: string }[],
): Promise<string> {
  const context = chunks
    .map(
      (c, i) =>
        `[${i + 1}] Document: ${c.document_name}${c.page ? `, page ${c.page}` : ""} (chunk ${c.chunk_index}, relevance ${(c.similarity * 100).toFixed(0)}%)\n${c.content}`,
    )
    .join("\n\n---\n\n");

  const result = streamText({
    model: model(),
    system: [
      "You are the Response Generation Agent of a document knowledge assistant.",
      "Answer ONLY from the provided context passages. Never use outside knowledge and never guess.",
      "If the passages do not contain enough evidence, say clearly that the knowledge base does not",
      "contain that information, and state what is missing.",
      "Cite sources inline as [1], [2] matching the numbered passages.",
      `The query was classified as ${type}: for procedural queries give ordered steps, for comparative`,
      "queries contrast the items point by point, for factual queries answer directly and briefly.",
      "Use markdown. Keep the answer under 250 words unless the question needs more.",
    ].join(" "),
    prompt: [
      history.length ? `Conversation so far:\n${history.map((m) => `${m.role}: ${m.content}`).join("\n")}\n` : "",
      `Context passages:\n${context || "(no passages retrieved)"}`,
      `\nUser question: ${query}`,
    ].join("\n"),
    providerOptions: reasoning,
  });

  return await result.text;
}
