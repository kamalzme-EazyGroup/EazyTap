import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseSettings, type SiteSettings } from "./site-settings";

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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
  const { data, error } = await supabase
    .from("site_settings")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parseSettings(data?.data);
});

export const siteSettingsQuery = queryOptions({
  queryKey: ["site-settings"],
  queryFn: () => getSiteSettings(),
  staleTime: 60_000,
});

const clean = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const hex = (v: unknown) => (/^#[0-9a-fA-F]{6}$/.test(String(v ?? "")) ? String(v) : "");

export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: SiteSettings): SiteSettings => ({
      site_name: clean(input.site_name, 60) || "EazyTap",
      logo_url:
        typeof input.logo_url === "string" && input.logo_url.startsWith("data:image/")
          ? input.logo_url
          : null,
      announcement: {
        enabled: input.announcement?.enabled === true,
        text: clean(input.announcement?.text, 200),
        link: clean(input.announcement?.link, 300),
      },
      colors: { primary: hex(input.colors?.primary), background: hex(input.colors?.background) },
      font: clean(input.font, 20),
      contact: {
        email: clean(input.contact?.email, 200),
        phone: clean(input.contact?.phone, 60),
        address: clean(input.contact?.address, 300),
      },
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_super_admin");
    if (roleError || !isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("site_settings")
      .update({ data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
