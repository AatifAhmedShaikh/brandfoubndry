import type { IdentityDirection } from "@shared/schemas";
import { FONTS, MARK_PATHS, casedName, initialOf, onColor } from "@shared/identity";

/**
 * Rasterises a logo to PNG with the canvas API, using the same geometry as the SVG builder.
 * Canvas text uses the document's loaded web fonts, so the PNG matches the on-screen preview.
 */
export async function logoPng(d: IdentityDirection, name: string, variant: "primary" | "mark" | "reversed", scale = 4): Promise<Blob> {
  const family = FONTS[d.typography.display].family;
  await Promise.all([document.fonts.load(`700 64px "${family}"`), document.fonts.load(`${d.wordmark.weight} 64px "${family}"`)]);
  const p = d.palette;
  const reversed = variant === "reversed";
  const word = casedName(name.trim() || "Untitled", d.wordmark.case);
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `${d.wordmark.weight} 64px "${family}"`;
  (measure as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${d.wordmark.tracking * 64}px`;
  const wordW = Math.ceil(measure.measureText(word).width);

  const hasMark = d.mark !== "none";
  const onlyMark = variant === "mark" && hasMark;
  const pad = reversed ? 40 : 8;
  const w = onlyMark ? 100 : (hasMark ? 128 : 0) + wordW;
  const h = 100;
  const canvas = document.createElement("canvas");
  canvas.width = (w + pad * 2) * scale;
  canvas.height = (h + pad * 2) * scale;
  const ctx = canvas.getContext("2d")! as CanvasRenderingContext2D & { letterSpacing: string };
  ctx.scale(scale, scale);
  if (reversed) {
    ctx.fillStyle = p.ink;
    ctx.fillRect(0, 0, w + pad * 2, h + pad * 2);
  }
  ctx.translate(pad, pad);
  ctx.textBaseline = "middle";

  if (hasMark) {
    const slash = d.mark === "slash";
    ctx.fillStyle = slash ? p.accent : reversed ? p.paper : p.primary;
    ctx.fill(new Path2D(MARK_PATHS[d.mark as Exclude<typeof d.mark, "none">]));
    ctx.fillStyle = slash ? (reversed ? p.paper : p.primary) : reversed ? p.primary : onColor(p.primary, p.ink, p.paper);
    ctx.font = `700 ${slash ? 78 : 54}px "${family}"`;
    ctx.textAlign = "center";
    ctx.fillText(initialOf(name), 50, slash ? 54 : d.mark === "arch" ? 62 : 53);
  }
  if (!onlyMark) {
    ctx.textAlign = "left";
    ctx.font = `${d.wordmark.weight} 64px "${family}"`;
    ctx.letterSpacing = `${d.wordmark.tracking * 64}px`;
    ctx.fillStyle = reversed ? p.paper : p.ink;
    ctx.fillText(word, hasMark ? 128 : 0, 52);
  }
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG encoding failed"))), "image/png"));
}
