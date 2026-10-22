function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Not a valid image"));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

/** Read a picked file as a data URL (no resizing). */
export function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/** Resize an uploaded image in the browser and return a compact data URL. */
export async function fileToDataUrl(file: File, maxSize: number, type: "image/jpeg" | "image/png" = "image/jpeg") {
  const img = await loadImage(await readFile(file));
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, 0.85);
}

/** Crop a region (in source pixels) and scale it down to maxSize on its longest side. */
export async function cropToDataUrl(
  src: string,
  area: { x: number; y: number; width: number; height: number },
  maxSize: number,
  type: "image/jpeg" | "image/png" = "image/jpeg",
) {
  const img = await loadImage(src);
  const scale = Math.min(1, maxSize / Math.max(area.width, area.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  canvas.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, 0.88);
}

/** Return a PNG copy of the image with softly rounded corners (transparent outside). */
export async function roundCorners(src: string, radiusRatio = 0.28) {
  const img = await loadImage(src);
  const w = img.width, h = img.height;
  const r = Math.min(w, h) * radiusRatio;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}
