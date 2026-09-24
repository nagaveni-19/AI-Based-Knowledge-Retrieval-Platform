import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const UploadInput = z.object({
  name: z.string().min(1),
  domain: z.string().default(""),
  base64: z.string().min(1),
});

export type DocumentRow = {
  id: string;
  name: string;
  domain: string | null;
  page_count: number;
  chunk_count: number;
  status: string;
  error: string | null;
  created_at: string;
};

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("id,name,domain,page_count,chunk_count,status,error,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DocumentRow[];
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Knowledge Base Ingestion: extract -> clean -> chunk -> embed -> index. */
export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadInput.parse(input))
  .handler(async ({ data, context }) => {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const { chunkPages } = await import("./chunking.server");
    const { embed } = await import("./ai.server");

    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));

    let pages: string[] = [];
    try {
      const pdf = await getDocumentProxy(bytes);
      const result = await extractText(pdf, { mergePages: false });
      pages = (result.text as string[]).map((t) => t ?? "");
    } catch {
      throw new Error("This PDF could not be read. It may be scanned, encrypted or damaged.");
    }

    const chunks = chunkPages(pages);
    if (chunks.length === 0) {
      throw new Error("No readable text was found in this PDF (it may be a scanned image).");
    }

    const { data: doc, error: docError } = await context.supabase
      .from("documents")
      .insert({
        user_id: context.userId,
        name: data.name,
        domain: data.domain || null,
        file_type: "pdf",
        page_count: pages.length,
        chunk_count: chunks.length,
        status: "processing",
      })
      .select("id")
      .single();
    if (docError || !doc) throw new Error(docError?.message ?? "Could not save the document.");

    try {
      const BATCH = 24;
      for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH);
        const vectors = await embed(batch.map((c) => c.content));
        const rows = batch.map((c, j) => ({
          document_id: doc.id,
          user_id: context.userId,
          chunk_index: c.index,
          page: c.page,
          section: c.section,
          content: c.content,
          embedding: JSON.stringify(vectors[j]) as unknown as string,
        }));
        const { error } = await context.supabase.from("chunks").insert(rows as never);
        if (error) throw new Error(error.message);
      }
      await context.supabase.from("documents").update({ status: "ready" }).eq("id", doc.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Indexing failed.";
      await context.supabase.from("documents").update({ status: "failed", error: message }).eq("id", doc.id);
      throw new Error(message);
    }

    return { id: doc.id, pages: pages.length, chunks: chunks.length };
  });
