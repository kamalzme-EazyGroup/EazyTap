import { z } from 'zod';
export const templateDesignSchema = z.object({
  fullName:z.string().max(120).default('Your name'),title:z.string().max(120).default(''),company:z.string().max(120).default(''),
  email:z.string().max(160).default(''),phone:z.string().max(60).default(''),website:z.string().max(200).default(''),
  theme:z.string().default('royal'),font:z.string().default('classic'),layout:z.enum(['classic','split','minimal']).default('classic'),
  tagline:z.string().max(160).default(''),avatar:z.string().nullable().default(null),cardSlug:z.string().default(''),
});
export type TemplateDesign = z.infer<typeof templateDesignSchema>;
export const newDesign = ():TemplateDesign => templateDesignSchema.parse({});