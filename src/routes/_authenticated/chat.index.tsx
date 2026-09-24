import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { createThread, listThreads } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Ask Atlas · your documents" },
      { name: "description", content: "Ask questions and get answers grounded in your uploaded documents." },
      { property: "og:title", content: "Ask Atlas · your documents" },
      { property: "og:description", content: "Grounded answers with sources from your own knowledge base." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchThreads = useServerFn(listThreads);
  const newThread = useServerFn(createThread);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const threads = await fetchThreads({});
      const target = threads[0] ?? (await newThread({}));
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: target.id }, replace: true });
    })();
  }, [fetchThreads, newThread, navigate, queryClient]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Opening conversation…</div>
  );
}
