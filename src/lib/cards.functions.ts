import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getPublicCard = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({ slug: String(input.slug).slice(0, 64) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient()
      .from("cards")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const { user_id: _omit, ...safe } = row;
    return safe;
  });

const clean = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      slug: string;
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      message?: string;
      answers?: Record<string, string>;
    }) => ({
      slug: clean(input.slug, 64),
      name: clean(input.name, 120),
      email: clean(input.email, 200),
      phone: clean(input.phone, 60),
      company: clean(input.company, 160),
      message: clean(input.message, 1000),
      answers: Object.fromEntries(
        Object.entries(input.answers ?? {})
          .slice(0, 30)
          .map(([k, v]) => [clean(k, 120), clean(v, 500)]),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id, user_id, collect_contacts, collect_fields")
      .eq("slug", data.slug)
      .maybeSingle();
    if (cardError) throw new Error(cardError.message);
    if (!card || !card.collect_contacts) throw new Error("This card is not collecting details");

    const fields = Array.isArray(card.collect_fields)
      ? (card.collect_fields as { label: string; required: boolean }[])
      : [];
    const standard: Record<string, string> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      message: data.message,
    };
    for (const f of fields) {
      if (!f?.label) continue;
      const value = standard[f.label.toLowerCase()] ?? data.answers[f.label] ?? "";
      if (f.required && !value) throw new Error(`${f.label} is required`);
    }

    const { error } = await supabase.from("card_leads").insert({
      card_id: card.id,
      owner_id: card.user_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      message: data.message,
      answers: data.answers,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getCardLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => ({ cardId: String(input.cardId) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("card_leads")
      .select("id, name, email, phone, company, message, answers, created_at")
      .eq("card_id", data.cardId)
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows;
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("card_leads")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
