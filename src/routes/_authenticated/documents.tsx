import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { FileText, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteDocument, ingestDocument, listDocuments } from "@/lib/kb.functions";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Knowledge base · Atlas" },
      {
        name: "description",
        content: "Upload PDFs into your Atlas knowledge base: text is extracted, chunked, embedded and indexed.",
      },
      { property: "og:title", content: "Knowledge base · Atlas" },
      { property: "og:description", content: "Manage the documents Atlas answers from." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function DocumentsPage() {
  const queryClient = useQueryClient();
  const fetchDocuments = useServerFn(listDocuments);
  const ingest = useServerFn(ingestDocument);
  const remove = useServerFn(deleteDocument);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [domain, setDomain] = useState("");

  const documents = useQuery({ queryKey: ["documents"], queryFn: () => fetchDocuments({}) });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await toBase64(file);
      return ingest({ data: { name: file.name, domain, base64 } });
    },
    onSuccess: () => {
      toast.success("Document added to your knowledge base.");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Upload failed."),
  });

  const destroy = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
    onError: () => toast.error("Could not delete that document."),
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="font-display text-4xl">Knowledge base</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add PDFs here. Atlas extracts the text, splits it into passages, embeds them and indexes them for search.
      </p>

      <section className="panel mt-8 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="domain">Domain or collection (optional)</Label>
            <Input
              id="domain"
              placeholder="e.g. HR policies, Product manuals"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">PDF file</Label>
            <Input
              id="file"
              ref={fileRef}
              type="file"
              accept="application/pdf"
              disabled={upload.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
              }}
            />
          </div>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <UploadCloud className="size-4" />
          {upload.isPending ? "Extracting, chunking and embedding… this can take a minute." : "Text-based PDFs work best; scanned images cannot be read."}
        </p>
      </section>

      <section className="mt-8 space-y-3">
        {documents.isLoading && <p className="text-sm text-muted-foreground">Loading documents…</p>}
        {documents.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No documents yet — add your first PDF above.</p>
        )}
        {documents.data?.map((doc) => (
          <div key={doc.id} className="panel flex items-center gap-4 p-4">
            <FileText className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{doc.name}</p>
              <p className="text-xs text-muted-foreground">
                {doc.domain ? `${doc.domain} · ` : ""}
                {doc.page_count} pages · {doc.chunk_count} passages ·{" "}
                <span className={doc.status === "ready" ? "text-success" : "text-warning"}>{doc.status}</span>
                {doc.error ? ` · ${doc.error}` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${doc.name}`}
              onClick={() => destroy.mutate(doc.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </section>
    </main>
  );
}
