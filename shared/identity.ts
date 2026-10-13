import type { FontKey, IdentityDirection, MarkStyle, Motif, Voice } from "./schemas";

/* ───────────────────────── Type library ───────────────────────── */

type FontMeta = {
  family: string;
  fallback: string;
  google: string;
  /** Average advance width in em, used to size SVG viewBoxes without a layout engine. */
  advance: number;
  register: "playful" | "serious" | "neutral";
  era: "traditional" | "experimental" | "neutral";
  note: string;
};

export const FONTS: Record<FontKey, FontMeta> = {
  "space-grotesk": { family: "Space Grotesk", fallback: "system-ui, sans-serif", google: "Space+Grotesk:wght@400;500;600;700", advance: 0.6, register: "neutral", era: "experimental", note: "Technical grotesk with quirky details" },
  inter: { family: "Inter", fallback: "system-ui, sans-serif", google: "Inter:wght@400;500;600;700", advance: 0.58, register: "neutral", era: "neutral", note: "Neutral workhorse for interfaces" },
  "instrument-serif": { family: "Instrument Serif", fallback: "Georgia, serif", google: "Instrument+Serif:ital@0;1", advance: 0.46, register: "serious", era: "traditional", note: "Condensed editorial serif" },
  fraunces: { family: "Fraunces", fallback: "Georgia, serif", google: "Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700", advance: 0.6, register: "neutral", era: "traditional", note: "Soft, warm old-style serif" },
  "dm-sans": { family: "DM Sans", fallback: "system-ui, sans-serif", google: "DM+Sans:wght@400;500;600;700", advance: 0.57, register: "playful", era: "neutral", note: "Friendly geometric sans" },
  syne: { family: "Syne", fallback: "system-ui, sans-serif", google: "Syne:wght@400;500;600;700", advance: 0.66, register: "playful", era: "experimental", note: "Wide, expressive display" },
  archivo: { family: "Archivo", fallback: "system-ui, sans-serif", google: "Archivo:wght@400;500;600;700", advance: 0.58, register: "serious", era: "neutral", note: "Utilitarian grotesk" },
  "ibm-plex-mono": { family: "IBM Plex Mono", fallback: "ui-monospace, monospace", google: "IBM+Plex+Mono:wght@400;500;600;700", advance: 0.62, register: "serious", era: "experimental", note: "Engineered monospace" },
  playfair: { family: "Playfair Display", fallback: "Georgia, serif", google: "Playfair+Display:wght@400;600;700", advance: 0.56, register: "serious", era: "traditional", note: "High-contrast classic serif" },
  manrope: { family: "Manrope", fallback: "system-ui, sans-serif", google: "Manrope:wght@400;500;600;700", advance: 0.6, register: "playful", era: "neutral", note: "Open, modern sans" },
  bricolage: { family: "Bricolage Grotesque", fallback: "system-ui, sans-serif", google: "Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700", advance: 0.56, register: "playful", era: "experimental", note: "Characterful grotesque" },
  cormorant: { family: "Cormorant Garamond", fallback: "Georgia, serif", google: "Cormorant+Garamond:wght@400;500;600;700", advance: 0.5, register: "serious", era: "traditional", note: "Refined Garamond display" },
};

export const fontStack = (k: FontKey) => `'${FONTS[k].family}', ${FONTS[k].fallback}`;
export const googleFontsUrl = (keys: FontKey[]) =>
  `https://fonts.googleapis.com/css2?${[...new Set(keys)].map((k) => `family=${FONTS[k].google}`).join("&")}&display=swap`;

/* ───────────────────────── Color ───────────────────────── */

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG 2.x contrast ratio, 1–21. */
export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
/** Readable text color (ink or paper) on a given background. */
export const onColor = (bg: string, ink = "#111110", paper = "#FFFFFF") => (contrast(bg, ink) >= contrast(bg, paper) ? ink : paper);

/* ───────────────────────── Marks ───────────────────────── */

export const xml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

export function casedName(name: string, c: IdentityDirection["wordmark"]["case"]) {
  if (c === "upper") return name.toUpperCase();
  if (c === "lower") return name.toLowerCase();
  return name;
}

export const initialOf = (name: string) => (name.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? "B").toUpperCase();

/** Container geometry for each mark style in a 100×100 box. Shared by SVG and PDF output. */
export const MARK_PATHS: Record<Exclude<MarkStyle, "none">, string> = {
  circle: "M50 0 A50 50 0 1 1 49.99 0 Z",
  square: "M8 0 H92 Q100 0 100 8 V92 Q100 100 92 100 H8 Q0 100 0 92 V8 Q0 0 8 0 Z",
  arch: "M0 100 V50 A50 50 0 0 1 100 50 V100 Z",
  slash: "M66 0 H90 L34 100 H10 Z",
};

/** "mark-reversed" is the mark alone, coloured for use on the ink colour. */
type Variant = "primary" | "mark" | "reversed" | "mark-reversed";

function markGroup(d: IdentityDirection, name: string, reversed: boolean) {
  if (d.mark === "none") return "";
  const p = d.palette;
  const letter = xml(initialOf(name));
  const font = xml(fontStack(d.typography.display));
  if (d.mark === "slash") {
    return `<path d="${MARK_PATHS.slash}" fill="${p.accent}"/><text x="50" y="54" text-anchor="middle" dominant-baseline="central" font-family="${font}" font-weight="700" font-size="78" fill="${reversed ? p.paper : p.primary}">${letter}</text>`;
  }
  const fill = reversed ? p.paper : p.primary;
  const ink = reversed ? p.primary : onColor(p.primary, p.ink, p.paper);
  return `<path d="${MARK_PATHS[d.mark]}" fill="${fill}"/><text x="50" y="${d.mark === "arch" ? 62 : 53}" text-anchor="middle" dominant-baseline="central" font-family="${font}" font-weight="700" font-size="54" fill="${ink}">${letter}</text>`;
}

/**
 * Builds a standalone SVG for a logo variant. All user text is XML-escaped and colors are
 * schema-validated hex values, so the string is safe to inline or download.
 */
export function logoSvg(d: IdentityDirection, rawName: string, variant: Variant = "primary", opts: { embedFonts?: boolean } = {}) {
  const name = rawName.trim() || "Untitled";
  const reversed = variant === "reversed";
  const bg = reversed ? d.palette.ink : null;
  const fontImport = opts.embedFonts ? `<style>@import url('${xml(googleFontsUrl([d.typography.display]))}');</style>` : "";

  if (variant === "mark" || variant === "mark-reversed") {
    const rev = variant === "mark-reversed";
    const g = d.mark === "none" ? wordmarkOnly(d, name, rev, 0) : markGroup(d, name, rev);
    const vb = d.mark === "none" ? wordmarkBox(d, name) : { w: 100, h: 100 };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb.w} ${vb.h}" width="${vb.w * 2}" height="${vb.h * 2}" role="img" aria-label="${xml(name)} mark">${fontImport}${g}</svg>`;
  }

  const mark = markGroup(d, name, reversed);
  const hasMark = d.mark !== "none";
  const offset = hasMark ? 128 : 0;
  const box = wordmarkBox(d, name);
  const w = Math.ceil(offset + box.w);
  const h = 100;
  const pad = reversed ? 40 : 0;
  const content = `${hasMark ? `<g>${mark}</g>` : ""}${wordmarkOnly(d, name, reversed, offset)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}" width="${(w + pad * 2) * 2}" height="${(h + pad * 2) * 2}" role="img" aria-label="${xml(name)} logo">${fontImport}${bg ? `<rect x="${-pad}" y="${-pad}" width="${w + pad * 2}" height="${h + pad * 2}" fill="${bg}"/>` : ""}${content}</svg>`;
}

const WORD_SIZE = 64;
function wordmarkBox(d: IdentityDirection, name: string) {
  const text = casedName(name, d.wordmark.case);
  const per = FONTS[d.typography.display].advance * (d.wordmark.case === "upper" ? 1.12 : 1) + d.wordmark.tracking;
  return { w: Math.ceil(text.length * WORD_SIZE * per + 8), h: 100 };
}
function wordmarkOnly(d: IdentityDirection, name: string, reversed: boolean, x: number) {
  const text = xml(casedName(name, d.wordmark.case));
  const fill = reversed ? d.palette.paper : d.palette.ink;
  return `<text x="${x}" y="52" dominant-baseline="central" font-family="${xml(fontStack(d.typography.display))}" font-weight="${d.wordmark.weight}" font-size="${WORD_SIZE}" letter-spacing="${(d.wordmark.tracking * WORD_SIZE).toFixed(2)}" fill="${fill}">${text}</text>`;
}

/* ───────────────────────── Motifs ───────────────────────── */

/** A small repeating SVG tile for a motif, suitable for a CSS background-image. */
export function motifTile(m: Motif, color: string, opacity = 0.35) {
  const s = (w: number, h: number, body: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.5">${body}</g></svg>`;
  switch (m) {
    case "grid":
      return s(28, 28, `<path d="M0 .75H28M.75 0V28"/>`);
    case "stripes":
      return s(14, 14, `<path d="M-2 16L16 -2M12 16L16 12M-2 2L2 -2"/>`);
    case "dots":
      return s(18, 18, `<circle cx="9" cy="9" r="1.8" fill="${color}" fill-opacity="${opacity}" stroke="none"/>`);
    case "arcs":
      return s(40, 40, `<path d="M0 40A40 40 0 0 1 40 0M0 28A28 28 0 0 1 28 0M0 16A16 16 0 0 1 16 0"/>`);
    case "weave":
      return s(24, 24, `<path d="M2 4H10M2 8H10M14 16H22M14 20H22M16 2V10M20 2V10M4 14V22M8 14V22" stroke-linecap="round"/>`);
    default:
      return "";
  }
}
export const motifCss = (m: Motif, color: string, opacity?: number) =>
  m === "none" ? "none" : `url("data:image/svg+xml,${encodeURIComponent(motifTile(m, color, opacity))}")`;

/* ───────────────────────── Rules-based construction ───────────────────────── */

type Preset = Omit<IdentityDirection, "id" | "source" | "rationale"> & { target: Voice["sliders"]; why: string };

/** Curated starting systems positioned on the four voice axes (0 = left pole, 100 = right pole). */
const PRESETS: Preset[] = [
  { name: "Quiet authority", target: { playful: 80, traditional: 30, approachable: 85, understated: 25 }, palette: { primary: "#1F2A44", secondary: "#B89B5E", accent: "#D9CBB0", ink: "#141414", paper: "#F4F1EA" }, typography: { display: "playfair", text: "inter" }, mark: "none", wordmark: { case: "upper", tracking: 0.18, weight: 600 }, motif: "none", imageDirection: "Still-life photography, natural light, generous negative space, muted tones.", why: "Serious and premium voice settings favour restraint: a high-contrast serif, spaced capitals and a deep, quiet palette." },
  { name: "Warm signal", target: { playful: 20, traditional: 50, approachable: 15, understated: 70 }, palette: { primary: "#FF6B3D", secondary: "#2E3A8C", accent: "#FFD23F", ink: "#1A1A1A", paper: "#FFF8EE" }, typography: { display: "bricolage", text: "dm-sans" }, mark: "circle", wordmark: { case: "lower", tracking: -0.02, weight: 700 }, motif: "dots", imageDirection: "Candid people shots, saturated colour, flash photography, playful crops.", why: "Playful and approachable settings call for rounded forms, a lowercase wordmark and a saturated warm primary." },
  { name: "Raw utility", target: { playful: 60, traditional: 85, approachable: 45, understated: 85 }, palette: { primary: "#111110", secondary: "#5B5BFF", accent: "#D7FF64", ink: "#111110", paper: "#F2F2EE" }, typography: { display: "syne", text: "inter" }, mark: "slash", wordmark: { case: "upper", tracking: 0.02, weight: 700 }, motif: "grid", imageDirection: "High-contrast documentary photography, hard flash, raw textures, grid-based layouts.", why: "Experimental and bold settings support a wide display face, an electric accent and an assertive slash mark." },
  { name: "Heritage craft", target: { playful: 55, traditional: 15, approachable: 40, understated: 45 }, palette: { primary: "#7A2E1F", secondary: "#2F4A3A", accent: "#E3B23C", ink: "#1E1A16", paper: "#F3EBDD" }, typography: { display: "fraunces", text: "dm-sans" }, mark: "arch", wordmark: { case: "title", tracking: 0, weight: 600 }, motif: "weave", imageDirection: "Hands at work, natural materials, warm daylight, close textile detail.", why: "Traditional settings lean on a warm old-style serif, an arched mark and earthy natural dyes." },
  { name: "Precise system", target: { playful: 70, traditional: 65, approachable: 50, understated: 35 }, palette: { primary: "#0E3B43", secondary: "#7FB7BE", accent: "#F25F5C", ink: "#0B1416", paper: "#F1F4F3" }, typography: { display: "space-grotesk", text: "ibm-plex-mono" }, mark: "square", wordmark: { case: "title", tracking: -0.01, weight: 600 }, motif: "stripes", imageDirection: "Clean product renders, diagrams, cool light, precise compositions.", why: "Serious, slightly experimental settings suit a technical grotesk, a mono companion and a cool, precise palette." },
];

const distance = (a: Voice["sliders"], b: Voice["sliders"]) =>
  Math.hypot(a.playful - b.playful, a.traditional - b.traditional, a.approachable - b.approachable, a.understated - b.understated);

/**
 * Deterministic fallback when image/AI generation is unavailable: picks the three curated systems
 * nearest to the approved voice sliders. Labelled "constructed" everywhere it is shown.
 */
export function constructDirections(sliders: Voice["sliders"]): IdentityDirection[] {
  return [...PRESETS]
    .sort((a, b) => distance(a.target, sliders) - distance(b.target, sliders))
    .slice(0, 3)
    .map(({ target: _t, why, ...p }, i) => ({ ...p, id: `c${i + 1}-${p.name.toLowerCase().replace(/\s+/g, "-")}`, source: "constructed" as const, rationale: why }));
}

export function tokens(d: IdentityDirection) {
  return {
    color: {
      primary: d.palette.primary,
      secondary: d.palette.secondary,
      accent: d.palette.accent,
      ink: d.palette.ink,
      paper: d.palette.paper,
      "on-primary": onColor(d.palette.primary, d.palette.ink, d.palette.paper),
    },
    font: {
      display: { family: FONTS[d.typography.display].family, stack: fontStack(d.typography.display) },
      text: { family: FONTS[d.typography.text].family, stack: fontStack(d.typography.text) },
    },
    wordmark: d.wordmark,
    motif: d.motif,
  };
}
