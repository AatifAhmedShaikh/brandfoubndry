import PDFDocument from "pdfkit";
import { createRequire } from "node:module";
import type { ArtifactKind, ArtifactSummary, Brief, Challenge, Finding, Identity, IdentityDirection, Naming, Positioning, Research, Voice } from "../shared/schemas";
import { FONTS, MARK_PATHS, casedName, hexToRgb, initialOf, logoSvg, onColor, tokens } from "../shared/identity";
import { KIND_LABEL } from "../shared/workflow";

export type KitBundle = {
  projectName: string;
  brief: Brief | null;
  research: Research | null;
  positioning: Positioning | null;
  voice: Voice | null;
  naming: Naming | null;
  identity: Identity | null;
  challenge: Challenge | null;
  findings: Finding[];
  summaries: ArtifactSummary[];
};

export const EXPORT_FILES = {
  "brand-guidelines.pdf": { type: "application/pdf", needsIdentity: false, label: "Brand guidelines", format: "PDF" },
  "strategy.md": { type: "text/markdown; charset=utf-8", needsIdentity: false, label: "Strategy document", format: "Markdown" },
  "tokens.json": { type: "application/json; charset=utf-8", needsIdentity: true, label: "Design tokens", format: "JSON" },
  "variables.css": { type: "text/css; charset=utf-8", needsIdentity: true, label: "CSS variables", format: "CSS" },
  "logo-primary.svg": { type: "image/svg+xml", needsIdentity: true, label: "Primary logo", format: "SVG" },
  "logo-mark.svg": { type: "image/svg+xml", needsIdentity: true, label: "Mark", format: "SVG" },
  "logo-reversed.svg": { type: "image/svg+xml", needsIdentity: true, label: "Reversed logo", format: "SVG" },
} as const;
export type ExportFile = keyof typeof EXPORT_FILES;

export const brandName = (b: KitBundle) => b.naming?.chosen || b.projectName;
export const activeDirection = (i: Identity | null): IdentityDirection | null => i?.directions.find((d) => d.id === i.activeId) ?? i?.directions[0] ?? null;

const statusOf = (b: KitBundle, k: ArtifactKind) => {
  const s = b.summaries.find((x) => x.kind === k);
  if (!s || s.status === "empty") return "not started";
  return s.status === "approved" ? `approved v${s.version}` : `draft v${s.version}, not approved`;
};

/* ───────────────────────── Text formats ───────────────────────── */

export function strategyMarkdown(b: KitBundle) {
  const name = brandName(b);
  const L: string[] = [`# ${name} — Brand strategy`, "", `_Exported from BrandFoundry on ${new Date().toISOString().slice(0, 10)}._`, ""];
  const section = (title: string, kind: ArtifactKind) => L.push(`## ${title}`, "", `> Status: ${statusOf(b, kind)}`, "");
  const bullets = (xs: string[]) => xs.forEach((x) => L.push(`- ${x}`));

  section("Brief", "brief");
  if (b.brief) {
    const f = b.brief;
    for (const [k, v] of [["Idea", f.idea], ["Industry", f.industry], ["Audience", f.audience], ["Problem", f.problem], ["Market", f.market], ["Business model", f.businessModel], ["Mission", f.mission], ["Vision", f.vision]] as const)
      if (v) L.push(`**${k}.** ${v}`, "");
    if (f.values.length) L.push(`**Values.** ${f.values.join(" · ")}`, "");
    if (f.personality.length) L.push(`**Personality.** ${f.personality.join(" · ")}`, "");
  }

  section("Positioning", "positioning");
  const p = b.positioning?.final;
  if (p) {
    L.push(`**${p.title}**`, "", `> ${p.statement}`, "", `**Audience.** ${p.audience}`, "", `**Problem.** ${p.problem}`, "", `**Value proposition.** ${p.valueProp}`, "", `**Brand promise.** ${p.promise}`, "", "**Differentiators**");
    bullets(p.differentiators);
    L.push("", "**Messaging implications**");
    bullets(p.messaging);
    L.push("", `**Rationale.** ${p.rationale}`, "", "**Trade-offs**");
    bullets(p.tradeoffs);
    L.push("", "**Risks**");
    bullets(p.risks);
    L.push("");
  } else L.push("_No positioning chosen yet._", "");

  section("Voice", "voice");
  const v = b.voice;
  if (v) {
    if (v.summary) L.push(v.summary, "");
    for (const pr of v.principles) L.push(`### ${pr.name}`, "", pr.description, "", `- Do: ${pr.do}`, `- Don't: ${pr.dont}`, "");
    if (v.pillars.length) {
      L.push("### Messaging pillars", "");
      v.pillars.forEach((x) => L.push(`- **${x.title}.** ${x.description}`));
      L.push("");
    }
    if (v.vocabulary.use.length || v.vocabulary.avoid.length) L.push(`**Use:** ${v.vocabulary.use.join(", ") || "—"}  `, `**Avoid:** ${v.vocabulary.avoid.join(", ") || "—"}`, "");
    if (v.taglines.length) {
      L.push("### Taglines", "");
      bullets(v.taglines);
      L.push("");
    }
  }

  section("Name", "naming");
  L.push(b.naming?.chosen ? `Chosen name: **${b.naming.chosen}**. Trademark and domain availability have **not** been checked.` : "_No name chosen yet._", "");

  section("Visual identity", "identity");
  const d = activeDirection(b.identity);
  if (d) {
    L.push(`**${d.name}.** ${d.rationale}`, "", "| Token | Value |", "|---|---|");
    for (const [k, hex] of Object.entries(d.palette)) L.push(`| ${k} | \`${hex}\` |`);
    L.push("", `**Display type:** ${FONTS[d.typography.display].family}  `, `**Text type:** ${FONTS[d.typography.text].family}`, "", `**Image direction.** ${d.imageDirection}`, "");
  } else L.push("_No identity direction selected yet._", "");

  const open = [...(b.brief?.assumptions.filter((a) => a.status === "open").map((a) => `Assumption (${a.field}): ${a.text}`) ?? []), ...(b.brief?.openQuestions.map((q) => `Open question: ${q}`) ?? []), ...(b.challenge?.findings.filter((f) => !f.resolved).map((f) => `Critique (${f.severity}, ${f.perspective}): ${f.title}. ${f.action}`) ?? []), ...b.findings.filter((f) => f.status === "open").map((f) => `Consistency (${f.severity}): ${f.title}. ${f.resolution}`)];
  L.push("## Outstanding assumptions and issues", "");
  if (open.length) bullets(open);
  else L.push("_None recorded._");
  L.push("");
  return L.join("\n");
}

export function tokensJson(b: KitBundle) {
  const d = activeDirection(b.identity)!;
  return JSON.stringify({ $schema: "brandfoundry/tokens@1", brand: brandName(b), direction: d.name, ...tokens(d) }, null, 2);
}

export function cssVariables(b: KitBundle) {
  const d = activeDirection(b.identity)!;
  const t = tokens(d);
  return [
    `/* ${brandName(b)} — ${d.name}. Generated by BrandFoundry. */`,
    `@import url("https://fonts.googleapis.com/css2?family=${FONTS[d.typography.display].google}&family=${FONTS[d.typography.text].google}&display=swap");`,
    ":root {",
    ...Object.entries(t.color).map(([k, v]) => `  --brand-${k}: ${v};`),
    `  --brand-font-display: ${t.font.display.stack};`,
    `  --brand-font-text: ${t.font.text.stack};`,
    "}",
    "",
  ].join("\n");
}

export const logoFile = (b: KitBundle, variant: "primary" | "mark" | "reversed") => logoSvg(activeDirection(b.identity)!, brandName(b), variant, { embedFonts: true });

/* ───────────────────────── PDF ───────────────────────── */

const require = createRequire(import.meta.url);
const font = (pkg: string, file: string) => require.resolve(`${pkg}/files/${file}`);
const F = {
  regular: font("@fontsource/space-grotesk", "space-grotesk-latin-400-normal.woff"),
  bold: font("@fontsource/space-grotesk", "space-grotesk-latin-700-normal.woff"),
  serif: font("@fontsource/instrument-serif", "instrument-serif-latin-400-italic.woff"),
};

/** Renders the guideline PDF. BrandFoundry's own type is embedded; brand faces are named, not embedded. */
export function guidelinesPdf(b: KitBundle): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 56, info: { Title: `${brandName(b)} brand guidelines`, Producer: "BrandFoundry" } });
  doc.registerFont("R", F.regular).registerFont("B", F.bold).registerFont("S", F.serif);
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));

  const name = brandName(b);
  const d = activeDirection(b.identity);
  const W = doc.page.width;
  const M = 56;
  const ink = "#111110";
  const stone = "#77766E";

  const eyebrow = (t: string) => doc.font("R").fontSize(8).fillColor(stone).text(t.toUpperCase(), { characterSpacing: 1.4 }).moveDown(0.6);
  const h = (t: string) => doc.font("B").fontSize(24).fillColor(ink).text(t).moveDown(0.5);
  const body = (t: string) => doc.font("R").fontSize(10.5).fillColor(ink).text(t, { lineGap: 3 }).moveDown(0.6);
  const label = (k: string, v: string) => {
    if (!v) return;
    doc.font("B").fontSize(9).fillColor(ink).text(k.toUpperCase(), { characterSpacing: 0.8 });
    body(v);
  };
  const list = (xs: string[]) => xs.forEach((x) => doc.font("R").fontSize(10.5).fillColor(ink).text(`—  ${x}`, { indent: 0, lineGap: 2 }));
  const page = (n: string, title: string, kind?: ArtifactKind) => {
    doc.addPage();
    doc.font("R").fontSize(8).fillColor(stone).text(`${name.toUpperCase()}  ·  BRAND GUIDELINES`, M, 28, { characterSpacing: 1.2 });
    doc.text(n, W - M - 40, 28, { width: 40, align: "right" });
    doc.moveTo(M, 44).lineTo(W - M, 44).lineWidth(0.5).strokeColor("#D5D1C5").stroke();
    doc.x = M;
    doc.y = 76;
    eyebrow(kind ? `${n} — ${statusOf(b, kind)}` : n);
    h(title);
  };

  // Cover
  const coverBg = d?.palette.ink ?? ink;
  const coverFg = d?.palette.paper ?? "#F5F2EA";
  doc.rect(0, 0, W, doc.page.height).fill(coverBg);
  if (d && d.mark !== "none") {
    doc.save().translate(M, 120).scale(0.9);
    doc.path(MARK_PATHS[d.mark]).fill(d.mark === "slash" ? d.palette.accent : d.palette.paper);
    doc.restore();
    doc.font("B").fontSize(48).fillColor(d.mark === "slash" ? d.palette.paper : onColor(d.palette.paper, d.palette.ink, d.palette.primary)).text(initialOf(name), M, 120 + (d.mark === "arch" ? 36 : 28), { width: 90, align: "center" });
  }
  doc.font("B").fontSize(64).fillColor(coverFg).text(d ? casedName(name, d.wordmark.case) : name, M, 300, { width: W - M * 2 });
  doc.font("S").fontSize(22).fillColor(coverFg).text("Brand guidelines", M, doc.y + 6);
  doc.font("R").fontSize(9).fillColor(coverFg).opacity(0.7).text(`Generated by BrandFoundry · ${new Date().toISOString().slice(0, 10)}`, M, doc.page.height - 90).opacity(1);

  // Strategy
  page("01", "Strategy", "positioning");
  const p = b.positioning?.final;
  if (p) {
    doc.font("S").fontSize(20).fillColor(ink).text(`“${p.statement}”`, { lineGap: 4 }).moveDown(1);
    label("Audience", p.audience);
    label("Problem", p.problem);
    label("Value proposition", p.valueProp);
    label("Brand promise", p.promise);
    if (p.differentiators.length) {
      doc.font("B").fontSize(9).text("DIFFERENTIATORS", { characterSpacing: 0.8 });
      list(p.differentiators);
      doc.moveDown(0.8);
    }
  } else body("No positioning has been chosen yet.");
  if (b.brief) {
    label("Mission", b.brief.mission);
    label("Vision", b.brief.vision);
    if (b.brief.values.length) label("Values", b.brief.values.join("  ·  "));
  }

  // Voice
  page("02", "Voice", "voice");
  const v = b.voice;
  if (v && (v.summary || v.principles.length)) {
    if (v.summary) body(v.summary);
    for (const pr of v.principles) {
      doc.font("B").fontSize(12).fillColor(ink).text(pr.name).moveDown(0.2);
      body(pr.description);
      doc.font("R").fontSize(9.5).fillColor(ink).text(`Do: ${pr.do}`).text(`Don't: ${pr.dont}`).moveDown(0.8);
    }
    if (v.vocabulary.use.length) label("Words we use", v.vocabulary.use.join(", "));
    if (v.vocabulary.avoid.length) label("Words we avoid", v.vocabulary.avoid.join(", "));
    if (v.taglines.length) {
      doc.font("B").fontSize(9).text("TAGLINES", { characterSpacing: 0.8 });
      v.taglines.forEach((t) => doc.font("S").fontSize(16).text(t));
    }
  } else body("No voice guidelines yet.");

  // Identity
  page("03", "Visual identity", "identity");
  if (d) {
    body(`${d.name}. ${d.rationale}`);
    const y0 = doc.y + 8;
    const sw = (W - M * 2 - 4 * 10) / 5;
    Object.entries(d.palette).forEach(([k, hex], i) => {
      const x = M + i * (sw + 10);
      doc.rect(x, y0, sw, 90).fillAndStroke(hex, "#D5D1C5");
      const [r, g, bl] = hexToRgb(hex);
      doc.font("B").fontSize(9).fillColor(ink).text(k.toUpperCase(), x, y0 + 100, { width: sw, characterSpacing: 0.8 });
      doc.font("R").fontSize(8.5).fillColor(stone).text(`${hex.toUpperCase()}\nRGB ${r} ${g} ${bl}`, x, y0 + 114, { width: sw });
    });
    doc.x = M;
    doc.y = y0 + 160;
    label("Display typeface", `${FONTS[d.typography.display].family}. ${FONTS[d.typography.display].note}.`);
    label("Text typeface", `${FONTS[d.typography.text].family}. ${FONTS[d.typography.text].note}.`);
    label("Wordmark", `${d.wordmark.case} case, weight ${d.wordmark.weight}, tracking ${d.wordmark.tracking}em. Mark style: ${d.mark}. Motif: ${d.motif}.`);
    label("Image direction", d.imageDirection);
    doc.font("R").fontSize(8.5).fillColor(stone).text("Specimens in this PDF use a stand-in face. Use the exported SVG and CSS files for production artwork; they reference the specified typefaces.");
  } else body("No identity direction selected yet.");

  // Open items
  page("04", "Outstanding assumptions");
  const open = [...(b.brief?.assumptions.filter((a) => a.status === "open").map((a) => `Assumption: ${a.text}`) ?? []), ...(b.brief?.openQuestions ?? []).map((q) => `Open question: ${q}`), ...(b.challenge?.findings.filter((f) => !f.resolved).map((f) => `${f.title}. ${f.action}`) ?? []), ...b.findings.filter((f) => f.status === "open").map((f) => `${f.title}. ${f.resolution}`)];
  if (open.length) list(open);
  else body("None recorded.");
  doc.moveDown(1.2);
  label("Artifact status", (["brief", "positioning", "voice", "naming", "identity"] as ArtifactKind[]).map((k) => `${KIND_LABEL[k]}: ${statusOf(b, k)}`).join("\n"));
  label("Legal", "Name and logo availability (trademarks, domains) has not been checked by BrandFoundry. Seek professional clearance before use.");

  doc.end();
  return done;
}
