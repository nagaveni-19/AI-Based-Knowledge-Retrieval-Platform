import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AssistantMeta } from "@/lib/chat.functions";

export type AnalyticsEvent = {
  id: string;
  threadId: string;
  query: string;
  createdAt: string;
  queryType: string;
  status: AssistantMeta["trace"]["status"];
  confidence: number;
  classificationConfidence: number;
  retrieved: number;
  kept: number;
  topScore: number;
  domains: string[];
  documents: string[];
};

export type AnalyticsSnapshot = {
  events: AnalyticsEvent[];
  documentCount: number;
  readyDocumentCount: number;
  domains: string[];
  generatedAt: string;
};

function isAssistantMeta(value: unknown): value is AssistantMeta {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AssistantMeta>;
  return Boolean(candidate.trace && typeof candidate.confidence === "number" && Array.isArray(candidate.sources));
}

export const getAnalyticsSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnalyticsSnapshot> => {
    const [{ data: messages, error: messageError }, { data: documents, error: documentError }] = await Promise.all([
      context.supabase
        .from("messages")
        .select("id,thread_id,role,content,meta,created_at")
        .order("created_at", { ascending: true }),
      context.supabase.from("documents").select("id,domain,status"),
    ]);

    if (messageError) throw new Error(messageError.message);
    if (documentError) throw new Error(documentError.message);

    const latestQueryByThread = new Map<string, string>();
    const events: AnalyticsEvent[] = [];

    for (const message of messages ?? []) {
      if (message.role === "user") {
        latestQueryByThread.set(message.thread_id, message.content);
        continue;
      }
      if (message.role !== "assistant" || !isAssistantMeta(message.meta)) continue;

      const meta = message.meta;
      const sourceDomains = meta.sources
        .map((source) => source.domain?.trim())
        .filter((domain): domain is string => Boolean(domain));
      const sourceDocuments = meta.sources.map((source) => source.documentName);

      events.push({
        id: message.id,
        threadId: message.thread_id,
        query: latestQueryByThread.get(message.thread_id) ?? meta.trace.searchQuery,
        createdAt: message.created_at,
        queryType: meta.trace.queryType || "unknown",
        status: meta.trace.status,
        confidence: meta.confidence,
        classificationConfidence: meta.trace.classificationConfidence,
        retrieved: meta.trace.retrieved,
        kept: meta.trace.kept,
        topScore: meta.trace.topScore,
        domains: [...new Set(sourceDomains)],
        documents: [...new Set(sourceDocuments)],
      });
    }

    const domains = [...new Set((documents ?? []).map((document) => document.domain?.trim()).filter((domain): domain is string => Boolean(domain)))].sort();

    return {
      events: events.reverse(),
      documentCount: documents?.length ?? 0,
      readyDocumentCount: (documents ?? []).filter((document) => document.status === "ready").length,
      domains,
      generatedAt: new Date().toISOString(),
    };
  });