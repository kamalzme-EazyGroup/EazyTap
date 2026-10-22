import { SOCIAL_KEYS, socialHref, type CardData } from "./card-types";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

export function buildVCard(card: CardData, pageUrl?: string) {
  const parts = card.full_name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop()! : "";
  const first = parts.join(" ");
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${esc(last)};${esc(first)};;;`, `FN:${esc(card.full_name)}`];
  if (card.company) lines.push(`ORG:${esc(card.company)}`);
  if (card.job_title) lines.push(`TITLE:${esc(card.job_title)}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${card.phone}`);
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${card.email}`);
  if (card.website) lines.push(`URL:${socialHref("linkedin", card.website)}`);
  if (card.address) lines.push(`ADR;TYPE=WORK:;;${esc(card.address)};;;;`);
  for (const s of SOCIAL_KEYS) {
    const v = card.socials[s.key];
    if (v) lines.push(`X-SOCIALPROFILE;TYPE=${s.key}:${socialHref(s.key, v)}`);
  }
  const notes: string[] = [];
  if (card.bio) notes.push(card.bio);
  for (const f of card.custom_fields) if (f.label && f.value) notes.push(`${f.label}: ${f.value}`);
  if (notes.length) lines.push(`NOTE:${esc(notes.join("\n"))}`);
  const m = card.avatar_url?.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/);
  if (m) lines.push(`PHOTO;ENCODING=b;TYPE=${m[1] === "png" ? "PNG" : "JPEG"}:${m[2]}`);
  if (pageUrl) lines.push(`SOURCE:${pageUrl}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function downloadVCard(card: CardData, pageUrl?: string) {
  const blob = new Blob([buildVCard(card, pageUrl)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(card.full_name || "contact").replace(/[^\w\s-]/g, "").trim() || "contact"}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
