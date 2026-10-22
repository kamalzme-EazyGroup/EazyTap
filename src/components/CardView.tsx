import {
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Send,
  Twitter,
  UserPlus,
  Youtube,
} from "lucide-react";
import type { ComponentType } from "react";
import { SOCIAL_KEYS, socialHref, type CardData, type SocialKey } from "@/lib/card-types";
import { downloadVCard } from "@/lib/vcard";

const ICONS: Record<SocialKey, ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  instagram: Instagram,
  x: Twitter,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music2,
  github: Github,
  whatsapp: MessageCircle,
  telegram: Send,
};

export function CardView({ card, pageUrl, compact }: { card: CardData; pageUrl?: string | undefined; compact?: boolean | undefined }) {
  const initials = card.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const socials = SOCIAL_KEYS.filter((s) => card.socials[s.key]);
  const subtitle = [card.job_title, card.company].filter(Boolean).join(" · ");

  const rows = [
    card.phone && { icon: Phone, label: "Phone", value: card.phone, href: `tel:${card.phone}` },
    card.email && { icon: Mail, label: "Email", value: card.email, href: `mailto:${card.email}` },
    card.website && { icon: Globe, label: "Website", value: card.website.replace(/^https?:\/\//, ""), href: socialHref("linkedin", card.website) },
    card.address && { icon: MapPin, label: "Address", value: card.address, href: `https://maps.google.com/?q=${encodeURIComponent(card.address)}` },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href: string }[];

  return (
    <div data-card-theme={card.theme} data-card-font={card.font} className="w-full overflow-hidden rounded-[2rem] shadow-float">
      <div className="relative h-36 bg-card-cover">
        {card.cover_url && <img src={card.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      </div>
      <div className="relative px-6 pb-7">
        <div className="-mt-14 mb-4 flex items-end justify-between">
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-c-bg bg-c-surface">
            {card.avatar_url ? (
              <img src={card.avatar_url} alt={card.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-3xl text-c-accent">
                {initials || "?"}
              </div>
            )}
          </div>
        </div>
        <h1 className="font-display text-3xl leading-tight">{card.full_name || "Your name"}</h1>
        {subtitle && <p className="mt-1 text-sm text-c-muted">{subtitle}</p>}
        {card.bio && <p className="mt-4 text-sm leading-relaxed text-c-muted">{card.bio}</p>}

        <button
          type="button"
          onClick={() => downloadVCard(card, pageUrl)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-c-accent py-3.5 text-sm font-semibold text-c-accent-fg transition hover:opacity-90 active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" /> Save to contacts
        </button>

        {!compact && rows.length > 0 && (
          <div className="mt-6 divide-y divide-c-line overflow-hidden rounded-2xl bg-c-surface">
            {rows.map((r) => (
              <a key={r.label} href={r.href} target={r.label === "Phone" || r.label === "Email" ? undefined : "_blank"} rel="noreferrer" className="flex items-center gap-4 px-4 py-3.5 transition hover:opacity-80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-c-bg text-c-accent">
                  <r.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] uppercase tracking-wider text-c-muted">{r.label}</span>
                  <span className="block truncate text-sm">{r.value}</span>
                </span>
              </a>
            ))}
          </div>
        )}

        {!compact && card.custom_fields.some((f) => f.label && f.value) && (
          <div className="mt-4 space-y-px overflow-hidden rounded-2xl bg-c-surface">
            {card.custom_fields
              .filter((f) => f.label && f.value)
              .map((f, i) => (
                <div key={i} className="px-4 py-3">
                  <span className="block text-[11px] uppercase tracking-wider text-c-muted">{f.label}</span>
                  <span className="block text-sm">{f.value}</span>
                </div>
              ))}
          </div>
        )}

        {socials.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {socials.map((s) => {
              const Icon = ICONS[s.key];
              return (
                <a key={s.key} href={socialHref(s.key, card.socials[s.key]!)} target="_blank" rel="noreferrer" aria-label={s.label} className="flex h-11 w-11 items-center justify-center rounded-full bg-c-surface text-c-accent transition hover:scale-110">
                  <Icon className="h-5 w-5" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
