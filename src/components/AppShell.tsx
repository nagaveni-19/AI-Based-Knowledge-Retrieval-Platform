import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, ClipboardCheck, FileText, Library, LogOut, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";
import mark from "@/assets/atlas-mark.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createThread, deleteThread, listThreads } from "@/lib/chat.functions";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };

  const fetchThreads = useServerFn(listThreads);
  const newThread = useServerFn(createThread);
  const removeThread = useServerFn(deleteThread);

  const threads = useQuery({ queryKey: ["threads"], queryFn: () => fetchThreads({}) });

  const create = useMutation({
    mutationFn: () => newThread({}),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    },
    onError: () => toast.error("Could not start a new conversation."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeThread({ data: { id } }),
    onSuccess: (_r, id) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      if (params.threadId === id) navigate({ to: "/chat" });
    },
    onError: () => toast.error("Could not delete that conversation."),
  });

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-3 px-5 py-5">
          <img src={mark} alt="" width={30} height={30} className="size-7" />
          <span className="font-display text-2xl">Atlas</span>
        </Link>

        <div className="px-4">
          <Button className="w-full justify-start gap-2" onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="size-4" /> New conversation
          </Button>
          <Button asChild variant="ghost" className="mt-2 w-full justify-start gap-2">
            <Link to="/documents">
              <Library className="size-4" /> Knowledge base
            </Link>
          </Button>
          <Button asChild variant="ghost" className="mt-1 w-full justify-start gap-2">
            <Link to="/analytics" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
              <BarChart3 className="size-4" /> Analytics
            </Link>
          </Button>
          <Button asChild variant="ghost" className="mt-1 w-full justify-start gap-2">
            <Link to="/testing" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
              <ClipboardCheck className="size-4" /> Testing
            </Link>
          </Button>
          <Button asChild variant="ghost" className="mt-1 w-full justify-start gap-2">
            <Link to="/report" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
              <FileText className="size-4" /> Project report
            </Link>
          </Button>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-2 pb-2 text-xs uppercase tracking-widest text-muted-foreground">Conversations</p>
          {threads.data?.length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">No conversations yet.</p>
          )}
          <ul className="space-y-1">
            {threads.data?.map((thread) => (
              <li
                key={thread.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md px-1 transition-colors hover:bg-sidebar-accent",
                  params.threadId === thread.id && "bg-sidebar-accent",
                )}
              >
                <Link
                  to="/chat/$threadId"
                  params={{ threadId: thread.id }}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm"
                >
                  <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{thread.title ?? "New conversation"}</span>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Delete conversation"
                  className="size-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                  onClick={() => remove.mutate(thread.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <img src={mark} alt="Atlas" width={30} height={30} className="size-7" />
            <span className="font-display text-2xl">Atlas</span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Workspace navigation">
            <Button size="icon" variant="ghost" aria-label="New conversation" onClick={() => create.mutate()} disabled={create.isPending}>
              <Plus className="size-4" />
            </Button>
            <Button asChild size="icon" variant="ghost">
              <Link to="/documents" aria-label="Knowledge base"><Library className="size-4" /></Link>
            </Button>
            <Button asChild size="icon" variant="ghost">
              <Link to="/analytics" aria-label="Analytics"><BarChart3 className="size-4" /></Link>
            </Button>
            <Button asChild size="icon" variant="ghost">
              <Link to="/testing" aria-label="Testing"><ClipboardCheck className="size-4" /></Link>
            </Button>
            <Button asChild size="icon" variant="ghost">
              <Link to="/report" aria-label="Project report"><FileText className="size-4" /></Link>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Sign out"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
