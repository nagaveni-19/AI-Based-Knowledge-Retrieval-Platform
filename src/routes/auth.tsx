import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpenCheck, Eye, EyeOff, FileSearch, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import mark from "@/assets/atlas-mark.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Atlas" },
      { name: "description", content: "Sign in to your Atlas workspace to ask questions about your own documents." },
      { property: "og:title", content: "Sign in · Atlas" },
      { property: "og:description", content: "Access your private document knowledge base on Atlas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/chat" });
  }, [session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/chat` },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your inbox to confirm your email address.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/chat" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/chat" });
  }

  return (
    <main className="grain relative grid min-h-screen overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.72fr)]">
      <Link
        to="/"
        className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" /> Back to Atlas
      </Link>

      <section className="hidden min-h-screen flex-col justify-between border-r border-border px-12 py-12 lg:flex xl:px-20">
        <div className="mt-14 flex items-center gap-3">
          <img src={mark} alt="Atlas" width={46} height={46} className="size-11" />
          <span className="font-display text-4xl">Atlas</span>
        </div>
        <div className="max-w-xl pb-8">
          <p className="mb-5 font-mono text-xs uppercase tracking-widest text-primary">Your private research desk</p>
          <h1 className="text-balance font-display text-6xl leading-[1.02]">
            Every answer connected to the evidence behind it.
          </h1>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { icon: FileSearch, label: "Search your documents" },
              { icon: BookOpenCheck, label: "Verify every source" },
              { icon: ShieldCheck, label: "Keep your work private" },
            ].map((item) => (
              <div key={item.label} className="border-l border-border pl-4">
                <item.icon className="size-5 text-evidence" />
                <p className="mt-3 text-sm leading-snug text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="font-mono text-xs text-muted-foreground">GROUNDed retrieval · Visible citations · Voice ready</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-20 sm:px-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <img src={mark} alt="Atlas" width={40} height={40} className="size-10" />
            <span className="font-display text-3xl">Atlas</span>
          </Link>

          <div className="mb-8 grid grid-cols-2 rounded-lg border border-border bg-muted/40 p-1" aria-label="Account access">
            <Button type="button" variant={mode === "signin" ? "secondary" : "ghost"} onClick={() => setMode("signin")}>
              Sign in
            </Button>
            <Button type="button" variant={mode === "signup" ? "secondary" : "ghost"} onClick={() => setMode("signup")}>
              Create account
            </Button>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">
              {mode === "signin" ? "Welcome back" : "Start your workspace"}
            </p>
            <h2 className="mt-3 font-display text-4xl">
              {mode === "signin" ? "Continue your research" : "Bring your knowledge together"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your documents and conversations stay private to your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="pr-11"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 size-8 text-muted-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" size="lg" className="group w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in to Atlas" : "Create your account"}
              {!busy && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleGoogle} disabled={busy}>
            <span className="grid size-5 place-items-center rounded-full bg-foreground font-sans text-xs font-semibold text-background">G</span>
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="link"
            className="mt-4 w-full text-muted-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
          </Button>
        </div>
      </section>
    </main>
  );
}
