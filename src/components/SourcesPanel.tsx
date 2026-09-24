import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import type { AssistantMeta } from "@/lib/chat.functions";
import { cn } from "@/lib/utils";

function confidenceLabel(value: number) {
  if (value >= 0.7) return { label: "High confidence", tone: "text-success" };
  if (value >= 0.45) return { label: "Moderate confidence", tone: "text-warning" };
  return { label: "Low confidence", tone: "text-destructive" };
}

/** Response transparency: pipeline trace, retrieved chunks, scores and citations. */
export function SourcesPanel({ meta }: { meta: AssistantMeta }) {
  const [open, setOpen] = useState(false);
  const { trace, sources, confidence } = meta;
  const conf = confidenceLabel(confidence);

  return (
    <div className="mt-3 rounded-lg border border-border bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs"
      >
        <span className={cn("font-medium", conf.tone)}>
          {conf.label} · {Math.round(confidence * 100)}%
        </span>
        <span className="text-muted-foreground">
          {trace.queryType} query · {sources.length} source{sources.length === 1 ? "" : "s"}
        </span>
        <ChevronDown className={cn("ml-auto size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-3 py-3 text-xs">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-4">
            <div>
              <dt className="uppercase tracking-wider">Classification</dt>
              <dd className="text-foreground">
                {trace.queryType} ({Math.round(trace.classificationConfidence * 100)}%)
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider">Retrieved</dt>
              <dd className="text-foreground">
                {trace.kept} kept of {trace.retrieved}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider">Top score</dt>
              <dd className="text-foreground">{trace.topScore.toFixed(3)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider">Status</dt>
              <dd className="text-foreground">{trace.status.replace("_", " ")}</dd>
            </div>
          </dl>

          {trace.searchQuery && (
            <p className="text-muted-foreground">
              Search query used: <span className="font-mono text-foreground">{trace.searchQuery}</span>
            </p>
          )}

          {sources.map((source, index) => (
            <div key={source.id} className="rounded-md border border-border bg-background/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-primary px-1.5 py-0.5 font-mono text-[10px] text-primary-foreground">
                  [{index + 1}]
                </span>
                <FileText className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{source.documentName}</span>
                {source.domain && <span className="text-muted-foreground">· {source.domain}</span>}
                {source.page != null && <span className="text-muted-foreground">· page {source.page}</span>}
                <span className="text-muted-foreground">· chunk {source.chunkIndex}</span>
                <span className="ml-auto font-mono text-evidence">{source.similarity.toFixed(3)}</span>
              </div>
              {source.section && <p className="mt-1 text-muted-foreground">Section: {source.section}</p>}
              <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {source.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
