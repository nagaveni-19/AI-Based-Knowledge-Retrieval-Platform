import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Mic, Route as RouteIcon, ShieldCheck } from "lucide-react";
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
  },
  {
    icon: FileText,
    title: "Answers from your documents",
    body: "Semantic search finds the most relevant passages; answers use only what was actually retrieved.",
  },
  {
    icon: ShieldCheck,
    title: "Shows its evidence",
    body: "Source document, page, chunk and relevance score for every answer, with a clear confidence indicator.",
  },
  {
    icon: Mic,
    title: "Listens and speaks",
    body: "Ask out loud with voice input and have answers read back to you.",
  },
];

function Landing() {
  const { session, loading } = useAuth();

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

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="panel p-6">
            <f.icon className="size-5 text-primary" />
            <h2 className="mt-4 font-display text-2xl">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Atlas · answers grounded in your own knowledge base
      </footer>
    </main>
  );
}
