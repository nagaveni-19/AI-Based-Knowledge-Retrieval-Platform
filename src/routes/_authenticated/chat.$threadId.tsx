import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Pause, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { SourcesPanel } from "@/components/SourcesPanel";
import { useSpeechInput, useSpeechOutput } from "@/hooks/useSpeech";
import { askQuestion, listMessages, type AssistantMeta, type ChatMessage } from "@/lib/chat.functions";
import mark from "@/assets/atlas-mark.png";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversation · Atlas" },
      { name: "description", content: "A grounded conversation with your document knowledge base." },
      { property: "og:title", content: "Conversation · Atlas" },
      { property: "og:description", content: "Answers with sources, relevance scores and confidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  return (
    <PromptInputProvider key={threadId}>
      <ChatWindow threadId={threadId} />
    </PromptInputProvider>
  );
}

function hasMeta(message: ChatMessage): message is ChatMessage & { meta: AssistantMeta } {
  return message.role === "assistant" && Boolean((message.meta as AssistantMeta)?.trace);
}

function ChatWindow({ threadId }: { threadId: string }) {
  const queryClient = useQueryClient();
  const controller = usePromptInputController();
  const fetchMessages = useServerFn(listMessages);
  const ask = useServerFn(askQuestion);
  const speech = useSpeechOutput();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const messages = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => fetchMessages({ data: { threadId } }),
  });

  const voice = useSpeechInput((text, final) => {
    controller.textInput.setInput(text);
    if (final) textareaRef.current?.focus();
  });

  useEffect(() => {
    if (voice.error) {
      toast.error(voice.error);
      voice.clearError();
    }
  }, [voice]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  const send = useMutation({
    mutationFn: (query: string) => ask({ data: { threadId, query } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      setPending(null);
      textareaRef.current?.focus();
    },
    onError: (error) => {
      setPending(null);
      toast.error(error instanceof Error ? error.message : "Something went wrong answering that question.");
    },
  });

  return (
    <div className="flex h-screen flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-8">
          {messages.data?.length === 0 && !pending && (
            <div className="flex flex-col items-center py-20 text-center">
              <img src={mark} alt="" width={56} height={56} className="size-14" />
              <h1 className="mt-5 font-display text-3xl">What would you like to know?</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Ask about anything in your knowledge base. Every answer shows the documents, passages and relevance
                scores it was built from.
              </p>
            </div>
          )}

          {messages.data?.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent
                className={cn(
                  message.role === "assistant" && "bg-transparent px-0 text-foreground",
                )}
              >
                <MessageResponse>{message.content}</MessageResponse>

                {hasMeta(message) && (
                  <>
                    <div className="mt-2 flex items-center gap-1">
                      {speech.speakingId === message.id ? (
                        <>
                          {speech.paused ? (
                            <Button size="sm" variant="ghost" onClick={speech.resume}>
                              <Play className="size-3.5" /> Resume
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={speech.pause}>
                              <Pause className="size-3.5" /> Pause
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={speech.stop}>
                            <Square className="size-3.5" /> Stop
                          </Button>
                        </>
                      ) : (
                        speech.supported && (
                          <Button size="sm" variant="ghost" onClick={() => speech.speak(message.id, message.content)}>
                            <Volume2 className="size-3.5" /> Read aloud
                          </Button>
                        )
                      )}
                    </div>
                    <SourcesPanel meta={message.meta} />
                  </>
                )}
              </MessageContent>
            </Message>
          ))}

          {pending && (
            <>
              <Message from="user">
                <MessageContent>{pending}</MessageContent>
              </Message>
              <Message from="assistant">
                <MessageContent className="bg-transparent px-0">
                  <Shimmer>Understanding, retrieving and composing an answer…</Shimmer>
                </MessageContent>
              </Message>
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-background/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            onSubmit={(message) => {
              const text = message.text?.trim();
              if (!text || send.isPending) return;
              if (voice.listening) voice.stop();
              setPending(text);
              controller.textInput.clear();
              send.mutate(text);
            }}
          >
            <PromptInputTextarea ref={textareaRef} placeholder="Ask a question about your documents…" />
            <PromptInputFooter className="justify-between">
              <div className="flex items-center gap-1">
                {voice.supported && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant={voice.listening ? "default" : "ghost"}
                      onClick={() => (voice.listening ? voice.stop() : voice.start())}
                    >
                      {voice.listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                      {voice.listening ? "Stop" : "Speak"}
                    </Button>
                    {voice.listening && (
                      <Button type="button" size="sm" variant="ghost" onClick={voice.restart}>
                        <RotateCcw className="size-4" /> Restart
                      </Button>
                    )}
                  </>
                )}
              </div>
              <PromptInputSubmit status={send.isPending ? "submitted" : undefined} disabled={send.isPending} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
