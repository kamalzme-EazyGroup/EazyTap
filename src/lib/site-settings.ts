export type SiteSettings = {
  site_name: string;
  logo_url: string | null;
  announcement: { enabled: boolean; text: string; link: string };
  colors: { primary: string; background: string };
  font: string; // "" = default, otherwise a CARD_FONTS id
  contact: { email: string; phone: string; address: string };
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_name: "EazyTap",
  logo_url: null,
  announcement: { enabled: false, text: "", link: "" },
  colors: { primary: "", background: "" },
  font: "",
  contact: { email: "", phone: "", address: "" },
};

export function parseSettings(data: unknown): SiteSettings {
  const d = (data ?? {}) as Partial<SiteSettings>;
  return {
    ...DEFAULT_SITE_SETTINGS,
    ...d,
    announcement: { ...DEFAULT_SITE_SETTINGS.announcement, ...(d.announcement ?? {}) },
    colors: { ...DEFAULT_SITE_SETTINGS.colors, ...(d.colors ?? {}) },
    contact: { ...DEFAULT_SITE_SETTINGS.contact, ...(d.contact ?? {}) },
  };
}
