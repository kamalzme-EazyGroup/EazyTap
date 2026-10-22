import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { StyledQR } from "@/components/StyledQR";
import { randomSlug, rowToCard } from "@/lib/card-types";

const cardsQuery = queryOptions({
  queryKey: ["my-cards"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", u.user!.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My cards — EazyTap" },
      { name: "description", content: "Manage your digital business cards and QR codes." },
      { property: "og:title", content: "My cards — EazyTap" },
      { property: "og:description", content: "Manage your digital business cards." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(cardsQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data: cards } = useSuspenseQuery(cardsQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [creating, setCreating] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function createCard() {
    setCreating(true);
    const { data, error } = await supabase
      .from("cards")
      .insert({ user_id: user.id, slug: randomSlug(), label: `Card ${cards.length + 1}`, full_name: "" })
      .select("id")
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["my-cards"] });
    navigate({ to: "/cards/$id", params: { id: data.id } });
  }

  async function remove(id: string) {
    if (!confirm("Delete this card? Its QR code will stop working.")) return;
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Card deleted");
    qc.invalidateQueries({ queryKey: ["my-cards"] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-aurora">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
          <Button variant="glass" size="sm" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl">My cards</h1>
            <p className="mt-2 text-muted-foreground">Each card has its own link and QR code.</p>
          </div>
          <Button variant="hero" size="lg" onClick={createCard} disabled={creating}>
            <Plus /> New card
          </Button>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-3xl glass p-16 text-center">
            <h2 className="text-2xl">No cards yet</h2>
            <p className="mt-2 text-muted-foreground">Create your first digital business card in under a minute.</p>
            <Button variant="hero" className="mt-6" onClick={createCard} disabled={creating}>
              <Plus /> Create card
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((row) => {
              const c = rowToCard(row);
              return (
                <div key={row.id} className="group overflow-hidden rounded-3xl border bg-card transition hover:border-primary/40">
                  <div data-card-theme={c.theme} className="flex items-center gap-4 p-5">
                    <div className="rounded-xl bg-c-surface p-1.5">
                      <StyledQR data={`${origin}/c/${c.slug}`} settings={c.qr_settings} size={84} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-c-muted">{c.label}</p>
                      <p className="truncate font-display text-xl">{c.full_name || "Untitled"}</p>
                      <p className="truncate text-sm text-c-muted">{c.job_title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t p-3">
                    <Button asChild size="sm" variant="secondary" className="flex-1 rounded-full">
                      <Link to="/cards/$id" params={{ id: row.id }}>
                        <Pencil /> Edit
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="rounded-full">
                      <Link to="/c/$slug" params={{ slug: c.slug }} target="_blank">
                        <Eye /> View
                      </Link>
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-full" onClick={() => remove(row.id)} aria-label="Delete">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
