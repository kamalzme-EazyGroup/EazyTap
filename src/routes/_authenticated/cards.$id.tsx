import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Copy, Download, ExternalLink, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { CardView } from "@/components/CardView";
import { StyledQR, type QRInstance } from "@/components/StyledQR";
import { SOCIAL_KEYS, rowToCard, type CardData, type QrSettings } from "@/lib/card-types";
import { CARD_THEMES } from "@/lib/themes";
import { readFile } from "@/lib/image";
import { CropDialog, type CropRequest } from "@/components/CropDialog";
import { cn } from "@/lib/utils";

const cardQuery = (id: string) =>
  queryOptions({
    queryKey: ["card", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

export const Route = createFileRoute("/_authenticated/cards/$id")({
  head: () => ({
    meta: [
      { title: "Edit card — Tapcard" },
      { name: "description", content: "Design your digital business card and QR code." },
      { property: "og:title", content: "Edit card — Tapcard" },
      { property: "og:description", content: "Design your digital business card and QR code." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(cardQuery(params.id)),
  component: Editor,
});

const DOT_TYPES: QrSettings["dotsType"][] = ["square", "dots", "rounded", "classy", "classy-rounded", "extra-rounded"];
const CORNER_TYPES: QrSettings["cornerType"][] = ["square", "dot", "extra-rounded"];
const QR_PRESETS: Pick<QrSettings, "fg" | "bg" | "cornerColor">[] = [
  { fg: "#111111", bg: "#ffffff", cornerColor: "#b8892f" },
  { fg: "#0b1f4d", bg: "#ffffff", cornerColor: "#2f6fd6" },
  { fg: "#0f3d2e", bg: "#f2fbf6", cornerColor: "#14a06b" },
  { fg: "#5a1a22", bg: "#fff5f5", cornerColor: "#e0566a" },
  { fg: "#e9c77b", bg: "#151310", cornerColor: "#e9c77b" },
  { fg: "#ffffff", bg: "#0b1220", cornerColor: "#5fd0ef" },
];

function Editor() {
  const { id } = Route.useParams();
  const { data: row } = useSuspenseQuery(cardQuery(id));
  const qc = useQueryClient();
  const [card, setCard] = useState<CardData>(() => rowToCard(row));
  const [saving, setSaving] = useState(false);
  const qrInstance = useRef<QRInstance | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/c/${card.slug}`;

  const set = <K extends keyof CardData>(k: K, v: CardData[K]) => setCard((c) => ({ ...c, [k]: v }));
  const setQr = (patch: Partial<QrSettings>) => setCard((c) => ({ ...c, qr_settings: { ...c.qr_settings, ...patch } }));
  const [cropReq, setCropReq] = useState<CropRequest | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-app-theme", "");
    html.setAttribute("data-card-theme", card.theme);
    return () => {
      html.removeAttribute("data-app-theme");
      html.removeAttribute("data-card-theme");
    };
  }, [card.theme]);

  const qrSettings = useMemo(() => card.qr_settings, [card.qr_settings]);

  async function save() {
    const slug = card.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
    if (slug.length < 3) { toast.error("Link must be at least 3 characters"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("cards")
      .update({ ...card, slug, custom_fields: card.custom_fields, socials: card.socials, qr_settings: card.qr_settings })
      .eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.code === "23505" ? "That link is already taken" : error.message); return; }
    setCard((c) => ({ ...c, slug }));
    qc.invalidateQueries({ queryKey: ["my-cards"] });
    qc.invalidateQueries({ queryKey: ["card", id] });
    toast.success("Card saved");
  }

  async function pickImage(file: File | undefined, opts: Omit<CropRequest, "src" | "onDone">, cb: (v: string) => void) {
    if (!file) return;
    try {
      setCropReq({ ...opts, src: await readFile(file), onDone: cb });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-aurora">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-full">
              <Link to="/dashboard" aria-label="Back">
                <ArrowLeft />
              </Link>
            </Button>
            <Input value={card.label} onChange={(e) => set("label", e.target.value)} className="h-9 w-44 border-transparent bg-transparent font-display text-lg focus-visible:border-input" />
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="glass" size="sm" className="hidden sm:inline-flex">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink /> Preview
              </a>
            </Button>
            <Button variant="hero" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1fr_400px]">
        <Tabs defaultValue="profile" className="min-w-0">
          <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1 rounded-full bg-secondary p-1">
            {["profile", "contact", "social", "fields", "theme", "qr"].map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-full px-4 capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t === "qr" ? "QR design" : t === "fields" ? "Custom fields" : t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile">
            <Panel>
              <div className="grid gap-6 sm:grid-cols-2">
                <ImagePicker label="Profile photo" value={card.avatar_url} round onPick={(f) => pickImage(f, { aspect: 1, round: true, maxSize: 400 }, (v) => set("avatar_url", v))} onClear={() => set("avatar_url", null)} />
                <ImagePicker label="Cover image" value={card.cover_url} onPick={(f) => pickImage(f, { aspect: 384 / 144, maxSize: 1000 }, (v) => set("cover_url", v))} onClear={() => set("cover_url", null)} />
              </div>
              <Field label="Full name"><Input value={card.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Jane Doe" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Job title"><Input value={card.job_title ?? ""} onChange={(e) => set("job_title", e.target.value)} /></Field>
                <Field label="Company"><Input value={card.company ?? ""} onChange={(e) => set("company", e.target.value)} /></Field>
              </div>
              <Field label="Short bio"><Textarea rows={3} value={card.bio ?? ""} onChange={(e) => set("bio", e.target.value)} /></Field>
              <Field label="Card link">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{origin}/c/</span>
                  <Input value={card.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                  <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied"); }} aria-label="Copy link"><Copy /></Button>
                </div>
              </Field>
            </Panel>
          </TabsContent>

          <TabsContent value="contact">
            <Panel>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone"><Input type="tel" value={card.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+94 77 123 4567" /></Field>
                <Field label="Email"><Input type="email" value={card.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
              </div>
              <Field label="Website"><Input value={card.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="yourcompany.com" /></Field>
              <Field label="Address"><Textarea rows={2} value={card.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field>
            </Panel>
          </TabsContent>

          <TabsContent value="social">
            <Panel>
              <div className="grid gap-4 sm:grid-cols-2">
                {SOCIAL_KEYS.map((s) => (
                  <Field key={s.key} label={s.label}>
                    <Input value={card.socials[s.key] ?? ""} placeholder={s.placeholder} onChange={(e) => set("socials", { ...card.socials, [s.key]: e.target.value })} />
                  </Field>
                ))}
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="fields">
            <Panel>
              <p className="text-sm text-muted-foreground">Add anything else — office hours, licence number, second phone, etc.</p>
              {card.custom_fields.map((f, i) => (
                <div key={i} className="flex items-end gap-3">
                  <Field label="Label" className="w-1/3"><Input value={f.label} onChange={(e) => set("custom_fields", card.custom_fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} /></Field>
                  <Field label="Value" className="flex-1"><Input value={f.value} onChange={(e) => set("custom_fields", card.custom_fields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} /></Field>
                  <Button variant="ghost" size="icon" onClick={() => set("custom_fields", card.custom_fields.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 /></Button>
                </div>
              ))}
              <Button variant="secondary" className="rounded-full" onClick={() => set("custom_fields", [...card.custom_fields, { label: "", value: "" }])}>
                <Plus /> Add field
              </Button>
            </Panel>
          </TabsContent>

          <TabsContent value="theme">
            <Panel>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {CARD_THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => set("theme", t.id)}
                    data-card-theme={t.id}
                    className={cn("overflow-hidden rounded-2xl border-2 text-left transition", card.theme === t.id ? "border-primary" : "border-transparent hover:border-border")}
                  >
                    <div className="h-14 bg-card-cover" />
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium">{t.name}</span>
                      <span className="h-4 w-4 rounded-full bg-c-accent" />
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="qr">
            <Panel>
              <Field label="Colour presets">
                <div className="flex flex-wrap gap-3">
                  {QR_PRESETS.map((p, i) => (
                    <button key={i} onClick={() => setQr(p)} className="flex h-10 overflow-hidden rounded-full border" aria-label={`Preset ${i + 1}`}>
                      <span className="w-6" style={{ background: p.bg }} />
                      <span className="w-6" style={{ background: p.fg }} />
                      <span className="w-6" style={{ background: p.cornerColor }} />
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <ColorField label="Dots" value={qrSettings.fg} onChange={(v) => setQr({ fg: v })} />
                <ColorField label="Corners" value={qrSettings.cornerColor} onChange={(v) => setQr({ cornerColor: v })} />
                <ColorField label="Background" value={qrSettings.bg} onChange={(v) => setQr({ bg: v })} />
              </div>
              <Field label="Dot style">
                <Chips options={DOT_TYPES} value={qrSettings.dotsType} onChange={(v) => setQr({ dotsType: v })} />
              </Field>
              <Field label="Corner style">
                <Chips options={CORNER_TYPES} value={qrSettings.cornerType} onChange={(v) => setQr({ cornerType: v })} />
              </Field>
              <Field label="Centre logo">
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm hover:bg-accent">
                    <ImagePlus className="h-4 w-4" /> {qrSettings.logo ? "Replace logo" : "Upload logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { pickImage(e.target.files?.[0], { aspect: 1, maxSize: 300, png: true }, (v) => setQr({ logo: v })); e.target.value = ""; }} />
                  </label>
                  {qrSettings.logo && (
                    <>
                      <img src={qrSettings.logo} alt="Logo" className="h-10 w-10 rounded-lg bg-secondary object-contain" />
                      <Button variant="ghost" size="sm" onClick={() => setQr({ logo: null })}><X /> Remove</Button>
                    </>
                  )}
                </div>
              </Field>
              {qrSettings.logo && (
                <Field label={`Logo size — ${Math.round(qrSettings.logoSize * 100)}%`}>
                  <Slider min={0.15} max={0.45} step={0.01} value={[qrSettings.logoSize]} onValueChange={([v]) => setQr({ logoSize: v ?? 0.3 })} />
                </Field>
              )}
            </Panel>
          </TabsContent>
        </Tabs>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-3xl glass p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium">Your QR code</p>
              <Button size="sm" variant="secondary" className="rounded-full" onClick={() => qrInstance.current?.download({ name: `${card.slug}-qr`, extension: "png" })}>
                <Download /> PNG
              </Button>
            </div>
            <div className="flex justify-center">
              <div className="overflow-hidden rounded-2xl">
                <StyledQR data={url} settings={qrSettings} size={220} onReady={(q) => (qrInstance.current = q)} />
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Save changes before sharing a new link.</p>
          </div>
          <div className="mx-auto max-w-sm">
            <CardView card={card} />
          </div>
        </aside>
      </div>
      <CropDialog request={cropReq} onClose={() => setCropReq(null)} />
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="space-y-5 rounded-3xl border bg-card p-6">{children}</div>;
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2 rounded-md border px-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="border-0 px-1 shadow-none focus-visible:ring-0" />
      </div>
    </Field>
  );
}

function Chips<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={cn("rounded-full border px-3 py-1.5 text-xs capitalize transition", value === o ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>
          {o.replace("-", " ")}
        </button>
      ))}
    </div>
  );
}

function ImagePicker({ label, value, round, onPick, onClear }: { label: string; value: string | null; round?: boolean; onPick: (f?: File) => void; onClear: () => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <label className={cn("flex h-20 cursor-pointer items-center justify-center overflow-hidden border border-dashed bg-secondary hover:bg-accent", round ? "w-20 rounded-full" : "w-32 rounded-xl")}>
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {value && <Button variant="ghost" size="sm" onClick={onClear}><X /> Remove</Button>}
      </div>
    </Field>
  );
}
