import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — EazyTap" },
      { name: "description", content: "Sign in or create your EazyTap account to build digital business cards." },
      { property: "og:title", content: "Sign in — EazyTap" },
      { property: "og:description", content: "Sign in to build your digital business cards." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "lovable") {
    if (provider === "google") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth",
        },
      });
      if (error) toast.error(error.message);
    } else {
      const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
      if (r.error) toast.error(r.error.message ?? "Sign-in failed");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-aurora">
      <header className="mx-auto w-full max-w-6xl px-6 py-6">
        <Logo />
      </header>
      <div className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm rounded-3xl glass p-8">
          {sent ? (
            <div className="text-center">
              <h1 className="text-3xl">Check your inbox</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We sent a confirmation link to <span className="text-foreground">{email}</span>. Click it to finish
                creating your account.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signin" ? "Sign in to manage your cards." : "Start building your digital card."}
              </p>
              <div className="mt-6 space-y-3">
                <Button type="button" variant="outline" className="h-11 w-full rounded-full" onClick={() => oauth("google")}>
                  Continue with Google
                </Button>
                <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>
                  Continue with Lovable
                </button>
              </div>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" variant="hero" className="h-11 w-full" disabled={busy}>
                  {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
                <button className="text-primary hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
