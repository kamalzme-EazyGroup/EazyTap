import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { ArrowLeft, Plus, Save, Trash2, Download, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { BusinessCard } from "@/components/BusinessCard";
import { CropDialog, type CropRequest } from "@/components/CropDialog";
import { readFile } from "@/lib/image";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery } from "@/lib/access-query";
import { can, customizationAction } from "@/lib/permissions";
import { templateDesignSchema, newDesign, linkedQrSettings, type TemplateDesign } from "@/lib/template-types";
import { CARD_THEMES, CARD_FONTS } from "@/lib/themes";
import { downloadBlob } from "@/lib/download";

const templatesQuery = queryOptions({
  queryKey: ["templates"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Sign in required");
    const { data, error } = await supabase
      .from("card_templates")
      .select("*")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});
const linksQuery = queryOptions({
  queryKey: ["template-card-links"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Sign in required");
    const { data, error } = await supabase
      .from("cards")
       .select("slug,label,qr_settings")
      .eq("user_id", u.user.id);
    if (error) throw error;
    return data;
  },
});
export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({
    meta: [
      { title: "Business card templates — EazyTap" },
      { name: "description", content: "Customize and export your business card designs as PNG." },
      { property: "og:title", content: "Business card templates — EazyTap" },
      { property: "og:description", content: "Your saved business card designs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    const a = await context.queryClient.ensureQueryData(accessQuery);
    if (can(a, "templates", "view")) {
      await context.queryClient.ensureQueryData(templatesQuery);
      if (can(a, "cards", "view")) await context.queryClient.ensureQueryData(linksQuery);
    }
  },
  component: TemplatesPage,
});
function TemplatesPage() {
  const { data: a } = useSuspenseQuery(accessQuery);
  if (!can(a, "templates", "view"))
    return (
      <main className="p-8">
        <h1 className="text-3xl">Templates are not enabled for your account</h1>
        <Button asChild className="mt-6">
          <Link to="/dashboard">My cards</Link>
        </Button>
      </main>
    );
  return <TemplateStudio />;
}
function TemplateStudio() {
  const { data: templates } = useSuspenseQuery(templatesQuery),
    { data: access } = useSuspenseQuery(accessQuery);
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const links = qc.getQueryData(linksQuery.queryKey) ?? [];
  const [id, setId] = useState<string | null>(null),
    [name, setName] = useState("My template"),
    [design, setDesign] = useState<TemplateDesign>(newDesign()),
    [original, setOriginal] = useState<TemplateDesign>(newDesign());
  const [busy, setBusy] = useState(false),
    [png, setPng] = useState<Blob | null>(null),
    [crop, setCrop] = useState<CropRequest | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const linkedCard = links.find((card) => card.slug === design.cardSlug);
  const qrSettings = useMemo(() => linkedQrSettings(linkedCard?.qr_settings), [linkedCard?.qr_settings]);
  const qrKey = JSON.stringify([design.cardSlug, qrSettings]);
  const [qrReadyKey, setQrReadyKey] = useState<string | null>(null);
  const qrReady = !design.cardSlug || qrReadyKey === qrKey;
  const editable = can(access, "templates", id ? "edit" : "add");
  function change<K extends keyof TemplateDesign>(key: K, value: TemplateDesign[K]) {
    setPng(null);
    setDesign((d) => ({ ...d, [key]: value }));
  }
  function reset() {
    setId(null);
    setName("My template");
    setDesign(newDesign());
    setOriginal(newDesign());
    setPng(null);
  }
  async function save() {
    setBusy(true);
    try {
      const parsed = templateDesignSchema.parse(design);
      const result = id
        ? await supabase
            .from("card_templates")
            .update({ name, design: parsed })
            .eq("id", id)
            .eq("user_id", user.id)
            .select("id")
            .single()
        : await supabase
            .from("card_templates")
            .insert({ name, design: parsed, user_id: user.id })
            .select("id")
            .single();
      if (result.error) throw result.error;
      setId(result.data.id);
      setOriginal(parsed);
      await qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save template");
    } finally {
      setBusy(false);
    }
  }
  async function prepare() {
    if (!preview.current || !qrReady) return;
    setBusy(true);
    try {
      await document.fonts.ready;
      const blob = await toBlob(preview.current, { pixelRatio: 3, cacheBust: true });
      if (!blob) throw new Error("Unable to create PNG");
      setPng(blob);
      toast.success("PNG ready");
    } catch {
      toast.error("Unable to prepare the PNG. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Logo />
          <Button asChild variant="ghost">
            <Link to="/dashboard">
              <ArrowLeft />
              My cards
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl">Business card templates</h1>
          <Button disabled={!can(access, "templates", "add")} onClick={reset}>
            <Plus />
            New template
          </Button>
        </div>
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="space-y-2">
            <h2 className="mb-4 text-sm text-muted-foreground">Saved templates</h2>
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">No saved templates</p>
            )}
            {templates.map((t) => (
              <div key={t.id} className="flex gap-1">
                <Button
                  variant={id === t.id ? "secondary" : "ghost"}
                  className="min-w-0 flex-1 justify-start"
                  onClick={() => {
                    const d = templateDesignSchema.safeParse(t.design);
                    if (!d.success) {
                      toast.error("This template cannot be opened");
                      return;
                    }
                    setId(t.id);
                    setName(t.name);
                    setDesign(d.data);
                    setOriginal(d.data);
                    setPng(null);
                  }}
                >
                  <span className="truncate">{t.name}</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${t.name}`}
                  disabled={!can(access, "templates", "delete")}
                  onClick={async () => {
                    if (!confirm("Delete this template?")) return;
                    const { error } = await supabase.from("card_templates").delete().eq("id", t.id);
                    if (error) {
                      toast.error("Unable to delete template");
                      return;
                    }
                    if (id === t.id) reset();
                    await qc.invalidateQueries({ queryKey: ["templates"] });
                    toast.success("Template deleted");
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </aside>
          <section className="min-w-0 lg:border-l lg:pl-8">
            <div className="mb-6 flex flex-wrap gap-3">
              <Input
                aria-label="Template name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!editable}
                className="max-w-xs"
              />
              <Button disabled={busy || !editable || !name.trim()} onClick={save}>
                <Save />
                Save template
              </Button>
              {png ? (
                <Button
                  onClick={() =>
                    downloadBlob(png, `${name.replace(/[^a-z0-9-]/gi, "-") || "business-card"}.png`)
                  }
                >
                  <Download />
                  Download PNG
                </Button>
              ) : (
                 <Button variant="outline" disabled={busy || !qrReady} onClick={prepare}>
                  <Download />
                  {busy ? "Preparing…" : "Prepare PNG"}
                </Button>
              )}
            </div>
            <div className="mb-8 overflow-x-auto">
              <div ref={preview} className="w-[680px]">
                 <BusinessCard design={design} qrSettings={qrSettings} onQrRendered={() => {
                   setQrReadyKey(qrKey);
                   setPng(null);
                 }} />
              </div>
            </div>
            <fieldset disabled={!editable} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {(
                 ["fullName", "title", "company", "companyAddress", "phone", "email", "website", "tagline"] as const
              ).map((k) => (
                <div key={k} className="space-y-2">
                  <Label htmlFor={`template-${k}`}>
                    {
                      {
                        fullName: "Full name",
                        title: "Job title",
                         company: "Company name",
                         companyAddress: "Company address",
                        phone: "Phone",
                        email: "Email",
                        website: "Website",
                        tagline: "Tagline",
                      }[k]
                    }
                  </Label>
                  <Input
                    id={`template-${k}`}
                     maxLength={k === "phone" ? 60 : k === "companyAddress" || k === "website" ? 200 : k === "email" || k === "tagline" ? 160 : 120}
                    value={design[k]}
                    onChange={(e) => change(k, e.target.value)}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select
                  disabled={!editable}
                  value={design.layout}
                  onValueChange={(v) => change("layout", v as TemplateDesign["layout"])}
                >
                  <SelectTrigger aria-label="Template layout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="split">Split</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {can(access, "themes", "view") && (
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    disabled={!editable}
                    value={design.theme}
                    onValueChange={(v) => change("theme", v)}
                  >
                    <SelectTrigger aria-label="Template theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_THEMES.map((t) => (
                        <SelectItem
                          key={t.id}
                          value={t.id}
                          disabled={
                            t.id !== design.theme &&
                            !can(
                              access,
                              "themes",
                              customizationAction(id ? original.theme : "royal", t.id, "royal"),
                            )
                          }
                        >
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {can(access, "fonts", "view") && (
                <div className="space-y-2">
                  <Label>Font style</Label>
                  <Select
                    disabled={!editable}
                    value={design.font}
                    onValueChange={(v) => change("font", v)}
                  >
                    <SelectTrigger aria-label="Template font">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_FONTS.map((f) => (
                        <SelectItem
                          key={f.id}
                          value={f.id}
                          disabled={
                            f.id !== design.font &&
                            !can(
                              access,
                              "fonts",
                              customizationAction(id ? original.font : "classic", f.id, "classic"),
                            )
                          }
                        >
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {can(access, "cards", "view") && can(access, "qr", "view") && (
                <div className="space-y-2">
                  <Label>Linked QR code</Label>
                  <Select
                    disabled={!editable}
                    value={design.cardSlug || "none"}
                    onValueChange={(v) => change("cardSlug", v === "none" ? "" : v)}
                  >
                    <SelectTrigger aria-label="Linked card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="none"
                        disabled={Boolean(design.cardSlug) && !can(access, "qr", "delete")}
                      >
                        No QR code
                      </SelectItem>
                      {links.map((c) => (
                        <SelectItem
                          key={c.slug}
                          value={c.slug}
                          disabled={
                            c.slug !== design.cardSlug &&
                            !can(
                              access,
                              "qr",
                              customizationAction(id ? original.cardSlug : "", c.slug, ""),
                            )
                          }
                        >
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Portrait</Label>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={!editable} asChild>
                    <label className="cursor-pointer">
                      <ImagePlus />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!editable}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setCrop({
                              src: await readFile(file),
                              aspect: 1,
                              round: true,
                              maxSize: 400,
                              onDone: (v) => change("avatar", v),
                            });
                          } catch {
                            toast.error("Unable to open image");
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </Button>
                  {design.avatar && (
                    <Button variant="ghost" onClick={() => change("avatar", null)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </fieldset>
          </section>
        </div>
      </main>
      <CropDialog request={crop} onClose={() => setCrop(null)} />
    </div>
  );
}
