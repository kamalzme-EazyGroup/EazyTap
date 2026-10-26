import { z } from "zod";
import { DEFAULT_QR, type QrSettings } from "@/lib/card-types";
export const templateDesignSchema = z.object({
  fullName: z.string().max(120).default("Your name"),
  title: z.string().max(120).default(""),
  company: z.string().max(120).default(""),
  companyAddress: z.string().max(200).default(""),
  email: z.string().max(160).default(""),
  phone: z.string().max(60).default(""),
  website: z.string().max(200).default(""),
  theme: z.string().default("royal"),
  font: z.string().default("classic"),
  layout: z.enum(["classic", "split", "minimal"]).default("classic"),
  tagline: z.string().max(160).default(""),
  avatar: z.string().nullable().default(null),
  cardSlug: z.string().default(""),
});
export type TemplateDesign = z.infer<typeof templateDesignSchema>;
export const newDesign = (): TemplateDesign => templateDesignSchema.parse({});

export function linkedQrSettings(value: unknown): QrSettings {
  return { ...DEFAULT_QR, ...(value && typeof value === "object" && !Array.isArray(value) ? value : {}) };
}
