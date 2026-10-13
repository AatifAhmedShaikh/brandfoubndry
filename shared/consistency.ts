import type { ArtifactKind, ArtifactSummary, Brief, Identity, Naming, Positioning, Severity, Voice } from "./schemas";
import { FONTS, contrast } from "./identity";
import { DEPENDENCIES, KIND_LABEL } from "./workflow";

export type Bundle = {
  brief: Brief | null;
  positioning: Positioning | null;
  voice: Voice | null;
  naming: Naming | null;
  identity: Identity | null;
  summaries: ArtifactSummary[];
};

export type RuleResult = {
  ruleId: string;
  title: string;
  severity: Severity;
  artifacts: ArtifactKind[];
  status: "pass" | "fail" | "n/a";
  detail: string;
  resolution: string;
};

type Rule = {
  id: string;
  title: string;
  severity: Severity;
  artifacts: ArtifactKind[];
  /** Returns null when the rule does not apply, [] when it passes, or failure messages. */
  check: (b: Bundle) => null | { detail: string; resolution: string; severity?: Severity }[];
};

const STOP = new Set("a an and are as at be by for from in into is it of on or our the their them they this to with who what young people customers users".split(" "));
const words = (s: string) => new Set(s.toLowerCase().match(/[a-zÀ-ɏ]{3,}/g)?.filter((w) => !STOP.has(w)) ?? []);
const activeDirection = (i: Identity | null) => i?.directions.find((d) => d.id === i.activeId) ?? i?.directions[0] ?? null;

/** Personality words mapped to the voice slider pole they imply. */
const ADJECTIVE_POLES: Record<string, { key: keyof Voice["sliders"]; high: boolean }> = {
  playful: { key: "playful", high: false }, fun: { key: "playful", high: false }, witty: { key: "playful", high: false }, cheeky: { key: "playful", high: false },
  serious: { key: "playful", high: true }, earnest: { key: "playful", high: true }, authoritative: { key: "playful", high: true },
  traditional: { key: "traditional", high: false }, heritage: { key: "traditional", high: false }, classic: { key: "traditional", high: false }, timeless: { key: "traditional", high: false },
  experimental: { key: "traditional", high: true }, rebellious: { key: "traditional", high: true }, disruptive: { key: "traditional", high: true }, innovative: { key: "traditional", high: true }, irreverent: { key: "traditional", high: true },
  approachable: { key: "approachable", high: false }, friendly: { key: "approachable", high: false }, warm: { key: "approachable", high: false }, accessible: { key: "approachable", high: false },
  premium: { key: "approachable", high: true }, luxurious: { key: "approachable", high: true }, refined: { key: "approachable", high: true }, exclusive: { key: "approachable", high: true }, elegant: { key: "approachable", high: true },
  bold: { key: "understated", high: true }, loud: { key: "understated", high: true }, confident: { key: "understated", high: true }, energetic: { key: "understated", high: true },
  understated: { key: "understated", high: false }, calm: { key: "understated", high: false }, quiet: { key: "understated", high: false }, minimal: { key: "understated", high: false },
};

export const RULES: Rule[] = [
  {
    id: "audience-alignment",
    title: "Positioning targets the audience in the brief",
    severity: "medium",
    artifacts: ["brief", "positioning"],
    check: ({ brief, positioning }) => {
      const a = brief?.audience.trim();
      const b = positioning?.final?.audience.trim();
      if (!a || !b) return null;
      const shared = [...words(a)].filter((w) => words(b).has(w));
      return shared.length > 0
        ? []
        : [{ detail: `Brief audience: “${a.slice(0, 140)}”. Positioning audience: “${b.slice(0, 140)}”. They share no key terms.`, resolution: "Either update the brief to the narrower audience you now intend, or rewrite the positioning audience to match the brief." }];
    },
  },
  {
    id: "personality-voice",
    title: "Voice sliders reflect the desired personality",
    severity: "medium",
    artifacts: ["brief", "voice"],
    check: ({ brief, voice }) => {
      if (!brief?.personality.length || !voice) return null;
      const out: { detail: string; resolution: string }[] = [];
      for (const adj of brief.personality) {
        const pole = ADJECTIVE_POLES[adj.toLowerCase().trim()];
        if (!pole) continue;
        const v = voice.sliders[pole.key];
        if ((pole.high && v < 40) || (!pole.high && v > 60))
          out.push({ detail: `The brief asks for “${adj}”, but the ${pole.key} slider sits at ${v}/100, toward the opposite pole.`, resolution: `Move the ${pole.key} slider ${pole.high ? "right" : "left"} of centre, or remove “${adj}” from the brief.` });
      }
      return out;
    },
  },
  {
    id: "text-contrast",
    title: "Body text meets WCAG AA contrast (4.5:1)",
    severity: "high",
    artifacts: ["identity"],
    check: ({ identity }) => {
      const d = activeDirection(identity);
      if (!d) return null;
      const c = contrast(d.palette.ink, d.palette.paper);
      return c >= 4.5 ? [] : [{ detail: `Ink ${d.palette.ink} on paper ${d.palette.paper} is ${c.toFixed(2)}:1.`, resolution: "Darken the ink or lighten the paper until the ratio reaches at least 4.5:1." }];
    },
  },
  {
    id: "primary-contrast",
    title: "Primary colour is visible on the paper colour (3:1)",
    severity: "medium",
    artifacts: ["identity"],
    check: ({ identity }) => {
      const d = activeDirection(identity);
      if (!d) return null;
      const c = contrast(d.palette.primary, d.palette.paper);
      return c >= 3 ? [] : [{ detail: `Primary ${d.palette.primary} on paper ${d.palette.paper} is ${c.toFixed(2)}:1. Logos and buttons in this colour will look washed out.`, resolution: "Choose a deeper primary, or reserve it for use on ink backgrounds." }];
    },
  },
  {
    id: "vocabulary-leak",
    title: "Strategy copy avoids the banned vocabulary",
    severity: "medium",
    artifacts: ["voice", "positioning"],
    check: ({ voice, positioning }) => {
      if (!voice?.vocabulary.avoid.length) return null;
      const copy = [positioning?.final?.statement, positioning?.final?.promise, ...voice.taglines, voice.websiteCopy.headline, voice.websiteCopy.subhead].filter(Boolean).join(" \n ").toLowerCase();
      if (!copy) return null;
      const hits = voice.vocabulary.avoid.filter((w) => new RegExp(`\\b${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(copy));
      return hits.length ? [{ detail: `Avoided words appear in approved copy: ${hits.map((h) => `“${h}”`).join(", ")}.`, resolution: "Rewrite those lines, or remove the words from the avoid list if they are acceptable after all." }] : [];
    },
  },
  {
    id: "chosen-name",
    title: "Identity is built on a chosen name",
    severity: "low",
    artifacts: ["naming", "identity"],
    check: ({ naming, identity }) => {
      if (!identity?.directions.length) return null;
      return naming?.chosen ? [] : [{ detail: "Logos are rendering the working project name because no name has been chosen.", resolution: "Pick a name in Naming, or confirm the working name by choosing it there." }];
    },
  },
  {
    id: "type-register",
    title: "Display typeface matches the voice register",
    severity: "low",
    artifacts: ["voice", "identity"],
    check: ({ voice, identity }) => {
      const d = activeDirection(identity);
      if (!d || !voice) return null;
      const reg = FONTS[d.typography.display].register;
      const v = voice.sliders.playful;
      if (v > 65 && reg === "playful") return [{ detail: `The voice is serious (${v}/100) but ${FONTS[d.typography.display].family} reads as playful.`, resolution: "Try a neutral or serious display face, or move the voice toward playful." }];
      if (v < 35 && reg === "serious") return [{ detail: `The voice is playful (${v}/100) but ${FONTS[d.typography.display].family} reads as serious.`, resolution: "Try a friendlier display face, or move the voice toward serious." }];
      return [];
    },
  },
  {
    id: "stale-approvals",
    title: "No approved artifact is built on outdated inputs",
    severity: "high",
    artifacts: [],
    check: ({ summaries }) => {
      const approved = summaries.filter((s) => s.status === "approved");
      if (!approved.length) return null;
      return approved.filter((s) => s.staleReason).map((s) => ({ detail: `${KIND_LABEL[s.kind]} is approved, but ${s.staleReason}.`, resolution: `Open ${KIND_LABEL[s.kind]}, check it against the change, then mark it still valid or regenerate it.` }));
    },
  },
  {
    id: "approval-order",
    title: "Approvals follow the workflow order",
    severity: "medium",
    artifacts: [],
    check: ({ summaries }) => {
      const by = new Map(summaries.map((s) => [s.kind, s]));
      const approved = summaries.filter((s) => s.status === "approved");
      if (!approved.length) return null;
      const out: { detail: string; resolution: string }[] = [];
      for (const s of approved)
        for (const dep of DEPENDENCIES[s.kind])
          if (dep !== "research" && by.get(dep) && by.get(dep)!.status !== "approved")
            out.push({ detail: `${KIND_LABEL[s.kind]} is approved while its input, ${KIND_LABEL[dep]}, is still a draft.`, resolution: `Approve ${KIND_LABEL[dep]} first, or return ${KIND_LABEL[s.kind]} to draft.` });
      return out;
    },
  },
];

export function evaluate(b: Bundle): { results: RuleResult[]; passed: number; total: number } {
  const results: RuleResult[] = [];
  for (const r of RULES) {
    const out = r.check(b);
    const artifacts = r.artifacts;
    if (out === null) results.push({ ruleId: r.id, title: r.title, severity: r.severity, artifacts, status: "n/a", detail: "", resolution: "" });
    else if (out.length === 0) results.push({ ruleId: r.id, title: r.title, severity: r.severity, artifacts, status: "pass", detail: "", resolution: "" });
    else for (const f of out) results.push({ ruleId: r.id, title: r.title, severity: f.severity ?? r.severity, artifacts, status: "fail", detail: f.detail, resolution: f.resolution });
  }
  const applicable = RULES.filter((r) => results.some((x) => x.ruleId === r.id && x.status !== "n/a"));
  const passed = applicable.filter((r) => !results.some((x) => x.ruleId === r.id && x.status === "fail")).length;
  return { results, passed, total: applicable.length };
}

/** Deterministic part of the voice checker. Works with no AI configured. */
export function voiceLint(text: string, voice: Voice) {
  const notes: { kind: "avoid" | "use" | "tone" | "length"; message: string }[] = [];
  const lower = text.toLowerCase();
  for (const w of voice.vocabulary.avoid) if (lower.includes(w.toLowerCase())) notes.push({ kind: "avoid", message: `Uses “${w}”, which is on the avoid list.` });
  const used = voice.vocabulary.use.filter((w) => lower.includes(w.toLowerCase()));
  if (voice.vocabulary.use.length && used.length) notes.push({ kind: "use", message: `Uses preferred vocabulary: ${used.map((u) => `“${u}”`).join(", ")}.` });
  const bangs = (text.match(/!/g) ?? []).length;
  if (bangs > 0 && voice.sliders.playful > 65) notes.push({ kind: "tone", message: `${bangs} exclamation mark${bangs > 1 ? "s" : ""} in a serious voice (${voice.sliders.playful}/100).` });
  if (voice.sliders.understated < 35 && /\b(best|ultimate|revolutionary|world-class|#1)\b/i.test(text)) notes.push({ kind: "tone", message: "Superlatives clash with an understated voice." });
  const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim());
  const avg = sentences.length ? text.split(/\s+/).length / sentences.length : 0;
  if (avg > 26) notes.push({ kind: "length", message: `Average sentence length is ${Math.round(avg)} words. Long for most brand voices.` });
  return notes;
}
