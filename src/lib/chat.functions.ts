import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type SourceChunk = {
  id: string;
  documentName: string;
  domain: string | null;
  page: number | null;
  section: string | null;
  chunkIndex: number;
  similarity: number;
  content: string;
};

export type PipelineTrace = {
  queryType: string;
  classificationConfidence: number;
  classificationReason: string;
  searchQuery: string;
  retrieved: number;
  kept: number;
  topScore: number;
  clarification: boolean;
  status: "answered" | "clarify" | "no_results" | "low_confidence" | "error";
};

export type AssistantMeta = {
  trace: PipelineTrace;
  sources: SourceChunk[];
  confidence: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  meta: AssistantMeta | Record<string, never>;
};

const MIN_SIMILARITY = 0.35;
const TOP_K = 8;

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("threads")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("threads")
      .insert({ user_id: context.userId })
      .select("id,title,updated_at")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not start a conversation.");
    return data;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("threads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error: threadError } = await context.supabase
      .from("threads")
      .select("id")
      .eq("id", data.threadId)
      .single();
    if (threadError) throw new Error("Conversation not found.");

    const { data: rows, error } = await context.supabase
      .from("messages")
      .select("id,role,content,meta,created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as ChatMessage[];
  });

/**
 * Multi-agent orchestration:
 * Query Understanding -> Clarification (if needed) -> Retrieval -> Response Generation.
 */
export const askQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid(), query: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { understandQuery, embed, generateAnswer } = await import("./ai.server");
    const supabase = context.supabase;

    const { error: threadError } = await supabase.from("threads").select("id").eq("id", data.threadId).single();
    if (threadError) throw new Error("Conversation not found.");

    // Conversation Memory Agent: keep only the most recent, bounded context.
    const { data: recent } = await supabase
      .from("messages")
      .select("role,content,created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: false })
      .limit(8);
    const history = (recent ?? [])
      .reverse()
      .map((m) => ({ role: m.role, content: m.content.slice(0, 700) }));

    const { data: docs } = await supabase.from("documents").select("name").eq("status", "ready");
    const documentNames = (docs ?? []).map((d) => d.name);

    await supabase.from("messages").insert({
      thread_id: data.threadId,
      user_id: context.userId,
      role: "user",
      content: data.query,
    });
    await supabase.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", data.threadId);

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", data.threadId);
    if ((count ?? 0) <= 1) {
      await supabase
        .from("threads")
        .update({ title: data.query.slice(0, 60) })
        .eq("id", data.threadId);
    }

    const save = async (content: string, meta: AssistantMeta) => {
      const { data: row } = await supabase
        .from("messages")
        .insert({
          thread_id: data.threadId,
          user_id: context.userId,
          role: "assistant",
          content,
          meta: meta as never,
        })
        .select("id,role,content,meta,created_at")
        .single();
      return row as unknown as ChatMessage;
    };

    const baseTrace = (over: Partial<PipelineTrace>): PipelineTrace => ({
      queryType: "unknown",
      classificationConfidence: 0,
      classificationReason: "",
      searchQuery: data.query,
      retrieved: 0,
      kept: 0,
      topScore: 0,
      clarification: false,
      status: "error",
      ...over,
    });

    try {
      // 1. Query Understanding Agent
      const understanding = await understandQuery(data.query, history, documentNames);

      // 2. Clarification Agent
      if (understanding.needsClarification && understanding.clarificationQuestion) {
        return await save(understanding.clarificationQuestion, {
          confidence: understanding.confidence,
          sources: [],
          trace: baseTrace({
            queryType: understanding.type,
            classificationConfidence: understanding.confidence,
            classificationReason: understanding.reasoning,
            searchQuery: understanding.searchQuery,
            clarification: true,
            status: "clarify",
          }),
        });
      }

      if (documentNames.length === 0) {
        return await save(
          "There are no documents in your knowledge base yet. Upload a PDF on the Knowledge base page and I can answer from it.",
          {
            confidence: 0,
            sources: [],
            trace: baseTrace({
              queryType: understanding.type,
              classificationConfidence: understanding.confidence,
              classificationReason: understanding.reasoning,
              searchQuery: understanding.searchQuery,
              status: "no_results",
            }),
          },
        );
      }

      // 3. Retrieval Agent
      const [queryVector] = await embed([understanding.searchQuery || data.query]);
      const { data: matches, error: matchError } = await supabase.rpc("match_chunks", {
        query_embedding: JSON.stringify(queryVector) as never,
        match_count: TOP_K,
      });
      if (matchError) throw new Error(matchError.message);

      const retrieved = (matches ?? []) as unknown as {
        id: string;
        document_id: string;
        document_name: string;
        domain: string | null;
        chunk_index: number;
        page: number | null;
        section: string | null;
        content: string;
        similarity: number;
      }[];
      const kept = retrieved.filter((c) => c.similarity >= MIN_SIMILARITY);
      const topScore = retrieved[0]?.similarity ?? 0;

      const sources: SourceChunk[] = kept.map((c) => ({
        id: c.id,
        documentName: c.document_name,
        domain: c.domain,
        page: c.page,
        section: c.section,
        chunkIndex: c.chunk_index,
        similarity: c.similarity,
        content: c.content,
      }));

      if (kept.length === 0) {
        return await save(
          "I could not find anything relevant to that in your knowledge base. Try rephrasing the question, or upload a document that covers this topic.",
          {
            confidence: 0,
            sources: [],
            trace: baseTrace({
              queryType: understanding.type,
              classificationConfidence: understanding.confidence,
              classificationReason: understanding.reasoning,
              searchQuery: understanding.searchQuery,
              retrieved: retrieved.length,
              kept: 0,
              topScore,
              status: "no_results",
            }),
          },
        );
      }

      // 4. Response Generation Agent
      const answer = await generateAnswer(data.query, understanding.type, kept, history);

      const avg = kept.reduce((s, c) => s + c.similarity, 0) / kept.length;
      const confidence = Math.max(0, Math.min(1, topScore * 0.6 + avg * 0.4));

      return await save(answer, {
        confidence,
        sources,
        trace: baseTrace({
          queryType: understanding.type,
          classificationConfidence: understanding.confidence,
          classificationReason: understanding.reasoning,
          searchQuery: understanding.searchQuery,
          retrieved: retrieved.length,
          kept: kept.length,
          topScore,
          status: confidence < 0.5 ? "low_confidence" : "answered",
        }),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      return await save(`I could not complete that request. ${message}`, {
        confidence: 0,
        sources: [],
        trace: baseTrace({ status: "error" }),
      });
    }
  });
