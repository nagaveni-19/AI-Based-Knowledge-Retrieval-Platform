import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpenCheck, CheckCircle2, CircleHelp, Gauge, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MilestoneHeader } from "@/components/MilestoneHeader";
import { getAnalyticsSnapshot, type AnalyticsEvent } from "@/lib/analytics.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [
    { title: "Query analytics & knowledge gaps · Atlas" },
    { name: "description", content: "Monitor Atlas query outcomes, confidence, retrieval quality, and knowledge gaps." },
    { property: "og:title", content: "Query analytics & knowledge gaps · Atlas" },
    { property: "og:description", content: "Live query analytics and knowledge-gap detection for Atlas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AnalyticsPage,
});

const statusLabels: Record<string, string> = { answered: "Answered", clarify: "Clarification", no_results: "Unanswered", low_confidence: "Low confidence", error: "Error" };

function AnalyticsPage() {
  const fetchSnapshot = useServerFn(getAnalyticsSnapshot);
  const snapshot = useQuery({ queryKey: ["analytics"], queryFn: () => fetchSnapshot({}) });
  const [period, setPeriod] = useState("all");
  const [domain, setDomain] = useState("all");
  const [queryType, setQueryType] = useState("all");
  const [status, setStatus] = useState("all");
  const [confidence, setConfidence] = useState("all");

  const filtered = useMemo(() => {
    const now = Date.now();
    return (snapshot.data?.events ?? []).filter((event) => {
      const age = now - new Date(event.createdAt).getTime();
      const periodMatch = period === "all" || (period === "7" && age <= 7 * 86400000) || (period === "30" && age <= 30 * 86400000);
      const confidenceBand = event.confidence >= 0.7 ? "high" : event.confidence >= 0.45 ? "medium" : "low";
      return periodMatch && (domain === "all" || event.domains.includes(domain)) && (queryType === "all" || event.queryType === queryType) && (status === "all" || event.status === status) && (confidence === "all" || confidenceBand === confidence);
    });
  }, [snapshot.data, period, domain, queryType, status, confidence]);

  const answered = filtered.filter((event) => event.status === "answered").length;
  const unresolved = filtered.filter((event) => event.status === "no_results" || event.status === "error");
  const lowConfidence = filtered.filter((event) => event.status === "low_confidence" || event.confidence < 0.45);
  const clarifications = filtered.filter((event) => event.status === "clarify").length;
  const avgConfidence = filtered.length ? filtered.reduce((sum, event) => sum + event.confidence, 0) / filtered.length : 0;
  const avgTopScore = filtered.length ? filtered.reduce((sum, event) => sum + event.topScore, 0) / filtered.length : 0;
  const types = ["factual", "procedural", "comparative", "ambiguous", "unknown"].map((name) => ({ name, count: filtered.filter((event) => event.queryType === name).length }));
  const maxType = Math.max(...types.map((item) => item.count), 1);

  return (
    <main className="w-full px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <MilestoneHeader eyebrow="Milestone 4.1" title="Query analytics & knowledge gaps" description="A live view of how Atlas resolves questions, where retrieval is weak, and which subjects need stronger source coverage." />

        <section className="grid gap-3 py-6 sm:grid-cols-2 xl:grid-cols-5" aria-label="Summary metrics">
          <Metric icon={MessageSquareText} label="Queries" value={filtered.length} detail="in current view" />
          <Metric icon={CheckCircle2} label="Resolution rate" value={`${filtered.length ? Math.round((answered / filtered.length) * 100) : 0}%`} detail={`${answered} answered`} tone="success" />
          <Metric icon={Gauge} label="Avg. confidence" value={`${Math.round(avgConfidence * 100)}%`} detail="application score" />
          <Metric icon={CircleHelp} label="Clarifications" value={clarifications} detail="targeted follow-ups" />
          <Metric icon={AlertTriangle} label="Knowledge gaps" value={unresolved.length + lowConfidence.length} detail="needs review" tone="warning" />
        </section>

        <section className="border-y border-border py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Filter activity</h2>
            <Button variant="ghost" size="sm" onClick={() => { setPeriod("all"); setDomain("all"); setQueryType("all"); setStatus("all"); setConfidence("all"); }}>Reset</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Filter value={period} onValueChange={setPeriod} placeholder="Time period" options={[["all", "All time"], ["7", "Last 7 days"], ["30", "Last 30 days"]]} />
            <Filter value={domain} onValueChange={setDomain} placeholder="Domain" options={[["all", "All domains"], ...(snapshot.data?.domains ?? []).map((item) => [item, item])]} />
            <Filter value={queryType} onValueChange={setQueryType} placeholder="Query type" options={[["all", "All query types"], ["factual", "Factual"], ["procedural", "Procedural"], ["comparative", "Comparative"], ["ambiguous", "Ambiguous"], ["unknown", "Unknown"]]} />
            <Filter value={confidence} onValueChange={setConfidence} placeholder="Confidence" options={[["all", "All confidence"], ["high", "High"], ["medium", "Moderate"], ["low", "Low"]]} />
            <Filter value={status} onValueChange={setStatus} placeholder="Status" options={[["all", "All outcomes"], ["answered", "Answered"], ["clarify", "Clarification"], ["low_confidence", "Low confidence"], ["no_results", "Unanswered"], ["error", "Error"]]} />
          </div>
        </section>

        {snapshot.isLoading ? <p className="py-16 text-center text-sm text-muted-foreground">Calculating workspace analytics…</p> : snapshot.isError ? <p className="py-16 text-center text-sm text-destructive">Analytics could not be loaded.</p> : (
          <>
            <section className="grid gap-8 py-8 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <div className="flex items-end justify-between"><div><p className="text-xs uppercase text-muted-foreground">Routing mix</p><h2 className="mt-1 font-display text-3xl">Query understanding</h2></div><span className="font-mono text-xs text-muted-foreground">{filtered.length} classified</span></div>
                <div className="mt-6 space-y-4">
                  {types.map((item) => <div key={item.name}><div className="mb-1.5 flex justify-between text-sm"><span className="capitalize">{item.name}</span><span className="font-mono text-muted-foreground">{item.count}</span></div><Progress value={(item.count / maxType) * 100} /></div>)}
                </div>
              </div>
              <div className="border-l-0 border-border lg:border-l lg:pl-8">
                <p className="text-xs uppercase text-muted-foreground">Retrieval health</p><h2 className="mt-1 font-display text-3xl">Evidence quality</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Quality label="Top relevance" value={`${Math.round(avgTopScore * 100)}%`} detail="mean top match" />
                  <Quality label="Ready sources" value={snapshot.data?.readyDocumentCount ?? 0} detail={`of ${snapshot.data?.documentCount ?? 0} documents`} />
                  <Quality label="Domains covered" value={snapshot.data?.domains.length ?? 0} detail="named collections" />
                </div>
                <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Scores are calculated from real saved responses. Empty values mean no measured activity matches the selected filters.</p>
              </div>
            </section>

            <section className="pb-10">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4"><div><p className="text-xs uppercase text-warning">Review queue</p><h2 className="mt-1 font-display text-3xl">Potential knowledge gaps</h2></div><Badge variant="outline">{unresolved.length + lowConfidence.length} flagged</Badge></div>
              <div className="divide-y divide-border">
                {[...unresolved, ...lowConfidence.filter((item) => !unresolved.some((unresolvedItem) => unresolvedItem.id === item.id))].slice(0, 20).map((event) => <GapRow key={event.id} event={event} />)}
                {unresolved.length + lowConfidence.length === 0 && <div className="py-12 text-center"><BookOpenCheck className="mx-auto size-8 text-success" /><p className="mt-3 font-medium">No knowledge gaps in this view</p><p className="mt-1 text-sm text-muted-foreground">Unanswered and low-confidence questions will appear here automatically.</p></div>}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof Gauge; label: string; value: string | number; detail: string; tone?: "success" | "warning" }) {
  return <article className="panel p-4"><Icon className={cn("size-4 text-primary", tone === "success" && "text-success", tone === "warning" && "text-warning")} /><p className="mt-5 text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>;
}

function Quality({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="rounded-md border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-display text-3xl text-evidence">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function Filter({ value, onValueChange, placeholder, options }: { value: string; onValueChange: (value: string) => void; placeholder: string; options: [string, string][] }) {
  return <Select value={value} onValueChange={onValueChange}><SelectTrigger aria-label={placeholder}><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}</SelectContent></Select>;
}

function GapRow({ event }: { event: AnalyticsEvent }) {
  return <article className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant={event.status === "error" || event.status === "no_results" ? "destructive" : "outline"}>{statusLabels[event.status] ?? event.status}</Badge><span className="text-xs capitalize text-muted-foreground">{event.queryType} · {Math.round(event.confidence * 100)}% confidence</span></div><p className="mt-2 truncate text-sm font-medium">{event.query}</p><p className="mt-1 text-xs text-muted-foreground">{event.documents.length ? event.documents.join(", ") : "No supporting document found"} · {new Date(event.createdAt).toLocaleDateString()}</p></div><Button asChild variant="ghost" size="sm"><Link to="/chat/$threadId" params={{ threadId: event.threadId }}>Open conversation <ArrowRight className="size-4" /></Link></Button></article>;
}