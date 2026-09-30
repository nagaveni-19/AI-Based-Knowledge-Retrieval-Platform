import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Circle, Gauge, Mic, Network, Search, ShieldCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MilestoneHeader } from "@/components/MilestoneHeader";

export const Route = createFileRoute("/_authenticated/testing")({
  head: () => ({ meta: [
    { title: "Testing & optimization · Atlas" },
    { name: "description", content: "Milestone 4 end-to-end test matrix, optimization register, and final demonstration checklist." },
    { property: "og:title", content: "Testing & optimization · Atlas" },
    { property: "og:description", content: "A transparent test and optimization workspace for Atlas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TestingPage,
});

const scenarios = [
  ["Factual retrieval", "Verify a precise fact is retrieved with its source, page, chunk, and citation."],
  ["Procedural explanation", "Verify ordered steps are grounded in relevant passages."],
  ["Comparative reasoning", "Compare entities across multiple documents without unsupported claims."],
  ["Ambiguous query", "Request one targeted clarification only when the question cannot be resolved."],
  ["Multi-turn memory", "Resolve follow-ups using relevant recent context without mixing unrelated history."],
  ["Domain switching", "Prevent evidence from one knowledge domain influencing another."],
  ["Voice interaction", "Check speech input recovery and play, pause, resume, and stop controls."],
  ["Transparency", "Confirm citations match displayed source metadata and relevance scores."],
];

const optimizations = [
  { title: "Retrieval", icon: Search, state: "Applied", body: "Top 8 semantic matches are ranked, then results below 0.35 similarity are removed before generation." },
  { title: "Prompt grounding", icon: ShieldCheck, state: "Applied", body: "The response agent is instructed to use retrieved passages only, cite them inline, and state when evidence is insufficient." },
  { title: "Agent routing", icon: Network, state: "Applied", body: "Queries are classified as factual, procedural, comparative, or ambiguous with an explicit confidence score and search query." },
  { title: "Conversation memory", icon: Gauge, state: "Applied", body: "Only the eight most recent messages are supplied, each bounded to 700 characters to reduce irrelevant history." },
  { title: "Voice reliability", icon: Mic, state: "Implemented", body: "Speech input supports start, stop, and restart with visible errors; speech output supports play, pause, resume, and stop." },
];

function TestingPage() {
  return <main className="w-full px-5 py-8 lg:px-10"><div className="mx-auto max-w-6xl">
    <MilestoneHeader eyebrow="Milestones 4.2 & 4.3" title="Testing & optimization" description="A practical verification board for three knowledge domains, agent collaboration, retrieval quality, memory, voice, and response transparency." />
    <section className="grid gap-4 py-8 md:grid-cols-3">
      {["Domain one", "Domain two", "Domain three"].map((domain, index) => <article key={domain} className="panel p-5"><div className="flex items-center justify-between"><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span><Badge variant="outline">Awaiting documents</Badge></div><h2 className="mt-8 font-display text-2xl">{domain}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Assign a distinct document collection, then run the complete scenario matrix below.</p><Button asChild variant="outline" className="mt-5 w-full"><Link to="/documents">Add domain documents <ArrowRight className="size-4" /></Link></Button></article>)}
    </section>
    <section className="grid gap-10 border-y border-border py-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div><p className="text-xs uppercase text-muted-foreground">End-to-end matrix</p><h2 className="mt-1 font-display text-3xl">Required scenarios</h2><div className="mt-5 divide-y divide-border">{scenarios.map(([title, body]) => <div key={title} className="flex gap-3 py-4"><Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p></div></div>)}</div></div>
      <div><p className="text-xs uppercase text-primary">Measurement rule</p><h2 className="mt-1 font-display text-3xl">Evidence before claims</h2><p className="mt-4 text-sm leading-relaxed text-muted-foreground">Atlas does not invent benchmark numbers. Run the same representative questions before and after tuning, then record retrieval accuracy, grounding, routing accuracy, clarification accuracy, memory consistency, voice reliability, and response time.</p><div className="mt-6 rounded-md border border-warning/40 bg-warning/10 p-4"><p className="text-sm font-medium text-warning">No completed benchmark recorded yet</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">The analytics page already measures live confidence and retrieval outcomes. Formal three-domain results require representative documents and expected answers.</p></div><Button asChild className="mt-5"><Link to="/analytics">Open live analytics <ArrowRight className="size-4" /></Link></Button></div>
    </section>
    <section className="py-8"><p className="text-xs uppercase text-muted-foreground">Optimization register</p><h2 className="mt-1 font-display text-3xl">Current system controls</h2><Accordion type="single" collapsible className="mt-5">{optimizations.map((item) => <AccordionItem key={item.title} value={item.title}><AccordionTrigger><span className="flex items-center gap-3"><item.icon className="size-4 text-evidence" /><span>{item.title}</span><Badge variant="outline">{item.state}</Badge></span></AccordionTrigger><AccordionContent><p className="max-w-3xl pl-7 leading-relaxed text-muted-foreground">{item.body}</p></AccordionContent></AccordionItem>)}</Accordion></section>
    <section className="border-t border-border py-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase text-muted-foreground">Final demonstration</p><h2 className="mt-1 font-display text-3xl">Presentation run sheet</h2></div><Button asChild variant="outline"><Link to="/report">Read project report <ArrowRight className="size-4" /></Link></Button></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["Ingest three domains", "Ask four query types", "Continue a multi-turn thread", "Show citations and scores", "Demonstrate voice controls", "Open live analytics", "Identify a knowledge gap", "Explain optimization choices"].map((item) => <div key={item} className="flex items-center gap-3 rounded-md border border-border bg-card p-3 text-sm"><Check className="size-4 shrink-0 text-success" />{item}</div>)}</div></section>
  </div></main>;
}