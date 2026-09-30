import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Database, FileSearch, Layers3, Mic, Network, ShieldCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MilestoneHeader } from "@/components/MilestoneHeader";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({ meta: [
    { title: "Technical project report · Atlas" },
    { name: "description", content: "Atlas architecture, agents, data flow, implementation, testing, limitations, and future work." },
    { property: "og:title", content: "Technical project report · Atlas" },
    { property: "og:description", content: "Complete technical documentation for the Atlas knowledge retrieval platform." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ReportPage,
});

const agents: [string, string][] = [
  ["Query Understanding Agent", "Classifies intent, estimates confidence, detects ambiguity, and produces the retrieval query."],
  ["Retrieval Agent", "Embeds the search query, retrieves the top eight passages, filters weak matches, and preserves source metadata."],
  ["Response Generation Agent", "Writes only from retrieved evidence and attaches inline numbered citations."],
  ["Clarification Agent", "Returns a focused follow-up when the original request cannot be resolved safely."],
  ["Conversation Memory Agent", "Supplies bounded recent context while keeping conversation history separate from the knowledge base."],
];

const sections = [
  { id: "problem", title: "Problem statement & objectives", body: "Knowledge workers need answers from private documents without losing the evidence behind them. Atlas ingests document collections, understands each question, retrieves relevant passages, and generates a source-grounded answer with confidence and transparent metadata." },
  { id: "ingestion", title: "Knowledge ingestion pipeline", body: "A signed-in user uploads a document and assigns an optional domain. Atlas extracts page text, creates overlapping 1,200-character chunks with 200-character overlap, preserves page and section metadata, generates 3,072-dimensional embeddings in batches, and indexes the vectors for cosine similarity search." },
  { id: "resolution", title: "Query resolution pipeline", body: "User query → bounded conversation memory → query understanding → clarification when necessary → semantic embedding → top-K vector retrieval → low-score filtering → grounded response generation → citations, confidence, and transparency panel → analytics." },
  { id: "data", title: "Data model & storage", body: "Profiles identify users. Documents store domain, processing state, page count, and chunk count. Chunks store extracted content, source metadata, and vector embeddings. Threads and messages store conversations separately; assistant message metadata records routing, retrieval, confidence, and sources for analytics." },
  { id: "implementation", title: "Implementation & configuration", body: "Atlas uses React with server-rendered routes, authenticated server functions, a protected cloud database with row-level access rules, a vector index, large-language and embedding models through Lovable AI, browser speech recognition, and browser speech synthesis. Retrieval uses top K = 8 and a minimum similarity of 0.35." },
  { id: "testing", title: "Testing & results", body: "The system exposes a three-domain test matrix covering factual, procedural, comparative, ambiguous, multi-turn, context-switching, voice, and transparency scenarios. Live analytics report actual query outcomes and confidence. Formal accuracy claims remain pending until representative documents and expected-answer datasets are loaded." },
  { id: "limitations", title: "Limitations", body: "Answer quality depends on extraction quality and document coverage. Browser speech support varies by browser. Similarity thresholds may require domain-specific tuning. Current ingestion is optimized for text-based PDFs, and formal benchmark results require curated evaluation sets." },
  { id: "future", title: "Future enhancements", body: "Planned extensions include broader DOCX, TXT, and CSV ingestion, hybrid keyword-vector retrieval, reranking, saved benchmark runs, configurable domain-specific thresholds, analytics exports, and richer speech language and voice controls." },
];

function ReportPage() {
  return <main className="w-full px-5 py-8 lg:px-10"><div className="mx-auto max-w-6xl">
    <MilestoneHeader eyebrow="Milestone 4.4" title="Technical documentation & project report" description="A complete, inspectable record of Atlas: why it exists, how information moves, what each agent does, what is measured, and what remains to improve." />
    <section className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
      {[[Layers3, "Five collaborating agents", "Explicit responsibilities and routing"], [Database, "Vector knowledge base", "Private, source-aware retrieval"], [ShieldCheck, "Grounded generation", "Evidence-only answers and citations"], [Mic, "Voice interaction", "Speech input and controlled playback"]].map(([Icon, title, body]) => { const FeatureIcon = Icon as typeof Layers3; return <article key={String(title)} className="panel p-5"><FeatureIcon className="size-5 text-primary" /><h2 className="mt-5 text-sm font-semibold">{String(title)}</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{String(body)}</p></article>; })}
    </section>
    <section className="grid gap-10 border-y border-border py-8 lg:grid-cols-[0.8fr_1.2fr]">
      <div><p className="text-xs uppercase text-muted-foreground">System architecture</p><h2 className="mt-1 font-display text-3xl">From document to defensible answer</h2><div className="mt-6 space-y-2">{["Upload & extraction", "Chunking & metadata", "Embedding & vector index", "Five-agent orchestration", "Response & citations", "Analytics & gaps"].map((item, index) => <div key={item} className="flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full border border-border font-mono text-xs text-primary">{index + 1}</span><span className="text-sm">{item}</span>{index < 5 && <ArrowRight className="ml-auto size-4 text-muted-foreground" />}</div>)}</div></div>
      <div><p className="text-xs uppercase text-evidence">Agent layer</p><h2 className="mt-1 font-display text-3xl">Responsibilities & hand-offs</h2><Accordion type="single" collapsible className="mt-5">{agents.map(([title, body]) => <AccordionItem key={title} value={title}><AccordionTrigger><span className="flex items-center gap-3"><Network className="size-4 text-evidence" />{title}</span></AccordionTrigger><AccordionContent><p className="pl-7 leading-relaxed text-muted-foreground">{body}</p></AccordionContent></AccordionItem>)}</Accordion></div>
    </section>
    <section className="py-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase text-muted-foreground">Report chapters</p><h2 className="mt-1 font-display text-3xl">Implementation record</h2></div><div className="flex gap-2"><Button asChild variant="outline"><Link to="/testing">Testing plan <ArrowRight className="size-4" /></Link></Button><Button asChild><Link to="/analytics">Live results <ArrowRight className="size-4" /></Link></Button></div></div><div className="mt-6 divide-y divide-border border-t border-border">{sections.map((section, index) => <article key={section.id} id={section.id} className="grid gap-3 py-6 sm:grid-cols-[3rem_minmax(0,1fr)]"><span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><div><h3 className="font-display text-2xl">{section.title}</h3><p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">{section.body}</p></div></article>)}</div></section>
    <section className="mb-6 flex flex-col items-start justify-between gap-4 rounded-md border border-primary/30 bg-primary/10 p-5 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><FileSearch className="size-5 text-primary" /><h2 className="font-display text-2xl">Ready for demonstration</h2></div><p className="mt-1 text-sm text-muted-foreground">Load three domain collections, run the test matrix, then present measured outcomes in analytics.</p></div><Button asChild><Link to="/documents">Open knowledge base <ArrowRight className="size-4" /></Link></Button></section>
  </div></main>;
}