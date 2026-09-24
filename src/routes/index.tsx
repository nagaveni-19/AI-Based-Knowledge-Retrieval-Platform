import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, FileText, Mic, Route as RouteIcon, ShieldCheck, X } from "lucide-react";
import mark from "@/assets/atlas-mark.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas — Grounded answers from your own documents" },
      {
        name: "description",
        content:
          "Upload PDFs and ask questions by text or voice. Atlas classifies each question, searches your documents and answers with sources, relevance scores and confidence.",
      },
      { property: "og:title", content: "Atlas — Grounded answers from your own documents" },
      {
        property: "og:description",
        content: "A multi-agent document assistant with transparent sources, confidence scores and voice support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: RouteIcon,
    title: "Understands the question",
    body: "Every question is classified as factual, procedural, comparative or ambiguous, then routed accordingly.",
    detail: "Atlas identifies what kind of answer you need before searching. Ambiguous questions prompt a focused follow-up instead of producing a weak guess.",
  },
  {
    icon: FileText,
    title: "Answers from your documents",
    body: "Semantic search finds the most relevant passages; answers use only what was actually retrieved.",
    detail: "Your question is matched against indexed passages across your private knowledge base. Only relevant retrieved text is passed into the answer.",
  },
  {
    icon: ShieldCheck,
    title: "Shows its evidence",
    body: "Source document, page, chunk and relevance score for every answer, with a clear confidence indicator.",
    detail: "Open the evidence panel beneath any response to inspect its citations, source passages, page details, similarity scores and confidence level.",
  },
  {
    icon: Mic,
    title: "Listens and speaks",
    body: "Ask out loud with voice input and have answers read back to you.",
    detail: "Use the microphone beside the question box to dictate a request, then play, pause, resume or stop spoken playback on an answer.",
  },
];

function Landing() {
  const { session, loading } = useAuth();
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const selectedFeature = activeFeature === null ? null : features[activeFeature];

  return (
    <main className="grain min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img src={mark} alt="Atlas" width={36} height={36} className="size-9" />
          <span className="font-display text-2xl">Atlas</span>
        </div>
        <Button asChild variant="ghost">
          <Link to={session ? "/chat" : "/auth"}>{loading ? "…" : session ? "Open workspace" : "Sign in"}</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-14 text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Multi-agent knowledge retrieval</p>
        <h1 className="mt-5 text-balance font-display text-5xl leading-[1.05] sm:text-6xl">
          Ask your documents anything, and see exactly where the answer came from.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Atlas reads your PDFs, understands what you are asking, retrieves the passages that matter and writes an
          answer grounded only in that evidence — never invented.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to={session ? "/chat" : "/auth"}>Start asking</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to={session ? "/documents" : "/auth"}>Build a knowledge base</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, index) => (
            <Button
              key={feature.title}
              type="button"
              variant="outline"
              aria-expanded={activeFeature === index}
              className="group h-auto min-h-48 whitespace-normal border-border bg-card p-6 text-left shadow-panel transition-all hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-glow focus-visible:ring-2"
              onClick={() => setActiveFeature(activeFeature === index ? null : index)}
            >
              <span className="flex h-full w-full flex-col items-start">
                <span className="flex w-full items-center justify-between">
                  <feature.icon className="size-5 text-primary" />
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </span>
                <span className="mt-4 font-display text-2xl font-normal text-foreground">{feature.title}</span>
                <span className="mt-2 text-sm font-normal leading-relaxed text-muted-foreground">{feature.body}</span>
                <span className="mt-auto pt-5 text-xs font-medium uppercase tracking-widest text-primary">Explore feature</span>
              </span>
            </Button>
          ))}
        </div>

        {selectedFeature && (
          <div className="mt-6 border-y border-border py-7" aria-live="polite">
            <div className="flex items-start gap-5">
              <selectedFeature.icon className="mt-1 size-6 shrink-0 text-evidence" />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-3xl">{selectedFeature.title}</h2>
                <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{selectedFeature.detail}</p>
                <Button asChild variant="link" className="mt-3 h-auto px-0">
                  <Link to={session ? "/chat" : "/auth"}>
                    {session ? "Try it in your workspace" : "Sign in to try it"} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
              <Button type="button" size="icon" variant="ghost" aria-label="Close feature details" onClick={() => setActiveFeature(null)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Atlas · answers grounded in your own knowledge base
      </footer>
    </main>
  );
}
