export const CARD_THEMES = [
  { id: "obsidian", name: "Obsidian Gold", swatch: ["#1c1a17", "#d9b26a"] },
  { id: "midnight", name: "Midnight", swatch: ["#141a33", "#5fd0ef"] },
  { id: "royal", name: "Royal Blue", swatch: ["#0d1a3d", "#3b82f6"] },
  { id: "emerald", name: "Emerald", swatch: ["#0f2620", "#5fe0a8"] },
  { id: "rose", name: "Rosewood", swatch: ["#2a1517", "#f19a9c"] },
  { id: "sunset", name: "Sunset", swatch: ["#2b1a10", "#f59340"] },
  { id: "ivory", name: "Ivory", swatch: ["#f7f3ea", "#2a2622"] },
  { id: "ocean", name: "Ocean Light", swatch: ["#eef5fb", "#2f6fd6"] },
] as const;

/** Font pairs; CSS lives in src/styles.css under [data-card-font]. */
export const CARD_FONTS = [
  { id: "classic", name: "Classic", sample: "Fraunces + Manrope" },
  { id: "modern", name: "Modern", sample: "Space Grotesk + DM Sans" },
  { id: "elegant", name: "Elegant", sample: "Playfair Display + Lato" },
  { id: "friendly", name: "Friendly", sample: "Nunito" },
  { id: "bold", name: "Bold", sample: "Bebas Neue + Barlow" },
  { id: "tech", name: "Tech", sample: "JetBrains Mono + Rubik" },
] as const;
