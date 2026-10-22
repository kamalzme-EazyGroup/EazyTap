import type { Tables } from "@/integrations/supabase/types";

export type CardRow = Tables<"cards">;

export const SOCIAL_KEYS = [
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/you" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/you" },
  { key: "x", label: "X / Twitter", placeholder: "https://x.com/you" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/you" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@you" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@you" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/you" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+94 77 123 4567" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/you" },
] as const;

export type SocialKey = (typeof SOCIAL_KEYS)[number]["key"];
export type Socials = Partial<Record<SocialKey, string>>;
export type CustomField = { label: string; value: string };

export type QrSettings = {
  dotsType: "square" | "dots" | "rounded" | "classy" | "classy-rounded" | "extra-rounded";
  cornerType: "square" | "dot" | "extra-rounded";
  fg: string;
  bg: string;
  cornerColor: string;
  logo?: string | null;
  logoSize: number;
};

export const DEFAULT_QR: QrSettings = {
  dotsType: "rounded",
  cornerType: "extra-rounded",
  fg: "#111111",
  bg: "#ffffff",
  cornerColor: "#3b82f6",
  logo: null,
  logoSize: 0.3,
};

export type CardData = {
  slug: string;
  label: string;
  full_name: string;
  job_title: string | null;
  company: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  socials: Socials;
  custom_fields: CustomField[];
  theme: string;
  font: string;
  qr_settings: QrSettings;
};

export function rowToCard(row: Omit<CardRow, "user_id">): CardData {
  return {
    slug: row.slug,
    label: row.label,
    full_name: row.full_name,
    job_title: row.job_title,
    company: row.company,
    bio: row.bio,
    phone: row.phone,
    email: row.email,
    website: row.website,
    address: row.address,
    avatar_url: row.avatar_url,
    cover_url: row.cover_url,
    socials: (row.socials ?? {}) as Socials,
    custom_fields: Array.isArray(row.custom_fields) ? (row.custom_fields as CustomField[]) : [],
    theme: row.theme,
    font: row.font ?? "classic",
    qr_settings: { ...DEFAULT_QR, ...((row.qr_settings ?? {}) as Partial<QrSettings>) },
  };
}

export function socialHref(key: SocialKey, value: string) {
  const v = value.trim();
  if (key === "whatsapp") return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export function randomSlug() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
