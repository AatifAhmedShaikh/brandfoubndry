import { z } from "zod";

/* ───────────────────────── Workflow vocabulary ───────────────────────── */

export const ARTIFACT_KINDS = [
  "brief",
  "research",
  "positioning",
  "voice",
  "naming",
  "identity",
  "challenge",
  "consistency",
] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];
export const ArtifactKindSchema = z.enum(ARTIFACT_KINDS);

const text = (max = 2000) => z.string().trim().max(max).default("");
const list = (max = 12, len = 280) => z.array(z.string().trim().min(1).max(len)).max(max).default([]);

/* ───────────────────────── Brief ───────────────────────── */

export const BUDGETS = ["unspecified", "bootstrapped", "modest", "funded"] as const;

export const AssumptionSchema = z.object({
  id: z.string().min(1).max(40),
  field: z.string().max(40),
  text: z.string().trim().min(1).max(600),
  status: z.enum(["open", "accepted", "dismissed"]).default("open"),
});
export type Assumption = z.infer<typeof AssumptionSchema>;

export const BriefSchema = z.object({
  idea: text(2000),
  industry: text(160),
  audience: text(800),
  problem: text(800),
  market: text(400),
  businessModel: text(400),
  values: list(8, 60),
  mission: text(600),
  vision: text(600),
  budget: z.enum(BUDGETS).default("unspecified"),
  personality: list(6, 40),
  /** AI-proposed assumptions. Kept apart from user-entered facts until the user accepts them. */
  assumptions: z.array(AssumptionSchema).max(20).default([]),
  openQuestions: list(10, 300),
});
export type Brief = z.infer<typeof BriefSchema>;

export const BRIEF_REQUIRED: (keyof Brief)[] = ["idea", "industry", "audience", "problem"];

/** Fields a brief must have before it can be approved. Pure, used by client and server. */
export function briefGaps(brief: Brief): string[] {
  const gaps: string[] = [];
  if (brief.idea.trim().length < 20) gaps.push("idea");
  for (const k of ["industry", "audience", "problem"] as const) if (!brief[k].trim()) gaps.push(k);
  if (brief.personality.length === 0) gaps.push("personality");
  return gaps;
}

/* ───────────────────────── Research ───────────────────────── */

export const CompetitorInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(500)]).default(""),
  positioning: text(800),
  audience: text(400),
  messaging: text(800),
  differentiation: text(600),
  visualNotes: text(600),
  notes: text(1000),
});
export type CompetitorInput = z.infer<typeof CompetitorInputSchema>;
export type Competitor = CompetitorInput & { id: string; createdAt: string };

export const SourceInputSchema = z.object({
  competitorId: z.string().max(40).nullable().default(null),
  url: z.url({ protocol: /^https?$/ }).max(500),
  title: text(200),
  excerpt: text(1200),
});
export type ResearchSource = z.infer<typeof SourceInputSchema> & { id: string; createdAt: string };

export const ResearchSchema = z.object({
  summary: text(1500),
  patterns: z
    .array(
      z.object({
        dimension: z.enum(["positioning", "audience", "messaging", "visual"]),
        observation: z.string().trim().max(600),
        competitors: list(10, 120),
        basis: z.enum(["entered-evidence", "ai-hypothesis"]),
      }),
    )
    .max(16)
    .default([]),
  gaps: z
    .array(z.object({ gap: z.string().trim().max(300), rationale: z.string().trim().max(600), basis: z.enum(["entered-evidence", "ai-hypothesis"]) }))
    .max(10)
    .default([]),
});
export type Research = z.infer<typeof ResearchSchema>;

/* ───────────────────────── Positioning ───────────────────────── */

export const DirectionSchema = z.object({
  id: z.string().min(1).max(40),
  title: text(80),
  audience: text(600),
  statement: text(800),
  problem: text(600),
  valueProp: text(600),
  differentiators: list(6, 240),
  promise: text(300),
  rationale: text(1000),
  tradeoffs: list(6, 300),
  risks: list(6, 300),
  messaging: list(6, 300),
});
export type Direction = z.infer<typeof DirectionSchema>;

export const PositioningSchema = z.object({
  directions: z.array(DirectionSchema).max(3).default([]),
  selectedId: z.string().max(40).nullable().default(null),
  /** The composed, editable direction the rest of the workflow uses. */
  final: DirectionSchema.nullable().default(null),
});
export type Positioning = z.infer<typeof PositioningSchema>;

/* ───────────────────────── Voice ───────────────────────── */

export const SLIDERS = [
  { key: "playful", left: "Playful", right: "Serious" },
  { key: "traditional", left: "Traditional", right: "Experimental" },
  { key: "approachable", left: "Approachable", right: "Premium" },
  { key: "understated", left: "Understated", right: "Bold" },
] as const;
export type SliderKey = (typeof SLIDERS)[number]["key"];

const slider = z.number().int().min(0).max(100).default(50);
export const VoiceSchema = z.object({
  sliders: z
    .object({ playful: slider, traditional: slider, approachable: slider, understated: slider })
    .default({ playful: 50, traditional: 50, approachable: 50, understated: 50 }),
  summary: text(800),
  principles: z
    .array(z.object({ name: text(60), description: text(400), do: text(300), dont: text(300) }))
    .max(5)
    .default([]),
  pillars: z.array(z.object({ title: text(80), description: text(400) })).max(5).default([]),
  vocabulary: z.object({ use: list(20, 40), avoid: list(20, 40) }).default({ use: [], avoid: [] }),
  taglines: list(8, 120),
  websiteCopy: z.object({ headline: text(160), subhead: text(400), cta: text(40) }).default({ headline: "", subhead: "", cta: "" }),
  social: z.array(z.object({ platform: text(30), text: text(600) })).max(6).default([]),
});
export type Voice = z.infer<typeof VoiceSchema>;

/* ───────────────────────── Naming ───────────────────────── */

export const NAME_STYLES = ["descriptive", "evocative", "invented", "compound", "founder", "acronym"] as const;
export const NamingCandidateInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  style: z.enum(NAME_STYLES).default("evocative"),
  rationale: text(600),
  pronunciation: text(80),
  drawbacks: text(600),
});
export type NamingCandidateInput = z.infer<typeof NamingCandidateInputSchema>;
export const NamingCandidatePatchSchema = z.object({
  status: z.enum(["candidate", "shortlisted", "rejected"]).optional(),
  favorite: z.boolean().optional(),
  rejectionNote: z.string().trim().max(400).optional(),
  rationale: z.string().trim().max(600).optional(),
  drawbacks: z.string().trim().max(600).optional(),
});
export type NamingCandidate = NamingCandidateInput & {
  id: string;
  status: "candidate" | "shortlisted" | "rejected";
  favorite: boolean;
  rejectionNote: string;
  source: "ai" | "user";
  createdAt: string;
};

export const NamingSchema = z.object({
  chosen: z.string().trim().max(40).nullable().default(null),
  criteria: list(8, 160),
});
export type Naming = z.infer<typeof NamingSchema>;

/* ───────────────────────── Visual identity ───────────────────────── */

export const HEX = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected #RRGGBB");
export const FONT_KEYS = [
  "space-grotesk",
  "inter",
  "instrument-serif",
  "fraunces",
  "dm-sans",
  "syne",
  "archivo",
  "ibm-plex-mono",
  "playfair",
  "manrope",
  "bricolage",
  "cormorant",
] as const;
export type FontKey = (typeof FONT_KEYS)[number];
export const MARK_STYLES = ["circle", "square", "arch", "slash", "none"] as const;
export type MarkStyle = (typeof MARK_STYLES)[number];
export const MOTIFS = ["grid", "stripes", "dots", "arcs", "weave", "none"] as const;
export type Motif = (typeof MOTIFS)[number];

export const IdentityDirectionSchema = z.object({
  id: z.string().min(1).max(40),
  name: text(60),
  rationale: text(800),
  palette: z.object({ primary: HEX, secondary: HEX, accent: HEX, ink: HEX, paper: HEX }),
  typography: z.object({ display: z.enum(FONT_KEYS), text: z.enum(FONT_KEYS) }),
  mark: z.enum(MARK_STYLES).default("circle"),
  wordmark: z
    .object({ case: z.enum(["upper", "lower", "title"]).default("title"), tracking: z.number().min(-0.08).max(0.4).default(0), weight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]).default(600) })
    .default({ case: "title", tracking: 0, weight: 600 }),
  motif: z.enum(MOTIFS).default("none"),
  imageDirection: text(800),
  source: z.enum(["ai", "constructed", "user"]).default("user"),
});
export type IdentityDirection = z.infer<typeof IdentityDirectionSchema>;

export const IdentitySchema = z.object({
  directions: z.array(IdentityDirectionSchema).max(6).default([]),
  activeId: z.string().max(40).nullable().default(null),
  variations: z
    .array(z.object({ id: z.string().max(40), label: text(60), savedAt: z.string().max(40), direction: IdentityDirectionSchema }))
    .max(24)
    .default([]),
});
export type Identity = z.infer<typeof IdentitySchema>;

/* ───────────────────────── Challenge + consistency ───────────────────────── */

export const PERSPECTIVES = ["customer", "strategist", "designer", "investor"] as const;
export const SEVERITIES = ["high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ChallengeFindingSchema = z.object({
  id: z.string().max(40),
  perspective: z.enum(PERSPECTIVES),
  title: text(160),
  severity: z.enum(SEVERITIES),
  basis: z.enum(["evidence", "judgment"]),
  evidence: text(600),
  affected: ArtifactKindSchema,
  rationale: text(800),
  action: text(600),
  resolved: z.boolean().default(false),
});
export type ChallengeFinding = z.infer<typeof ChallengeFindingSchema>;
export const ChallengeSchema = z.object({ findings: z.array(ChallengeFindingSchema).max(24).default([]) });
export type Challenge = z.infer<typeof ChallengeSchema>;

export const ConsistencySchema = z.object({ lastRunAt: z.string().nullable().default(null), passed: z.number().int().default(0), total: z.number().int().default(0) });

export type Finding = {
  id: string;
  source: "rule" | "ai";
  ruleId: string | null;
  severity: Severity;
  title: string;
  detail: string;
  artifacts: ArtifactKind[];
  resolution: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
};

/* ───────────────────────── Artifact registry ───────────────────────── */

export const ARTIFACT_SCHEMAS = {
  brief: BriefSchema,
  research: ResearchSchema,
  positioning: PositioningSchema,
  voice: VoiceSchema,
  naming: NamingSchema,
  identity: IdentitySchema,
  challenge: ChallengeSchema,
  consistency: ConsistencySchema,
} satisfies Record<ArtifactKind, z.ZodType>;

export type ArtifactData = {
  brief: Brief;
  research: Research;
  positioning: Positioning;
  voice: Voice;
  naming: Naming;
  identity: Identity;
  challenge: Challenge;
  consistency: z.infer<typeof ConsistencySchema>;
};

export function emptyArtifact<K extends ArtifactKind>(kind: K): ArtifactData[K] {
  return ARTIFACT_SCHEMAS[kind].parse({}) as ArtifactData[K];
}

export type Provenance = {
  source: "manual" | "ai" | "rules" | "demo" | "restore";
  model?: string;
  task?: string;
  note?: string;
  /** Upstream artifact versions this version was built from. */
  upstream?: Partial<Record<ArtifactKind, { version: number; approved: boolean }>>;
};

export type ArtifactStatus = "empty" | "draft" | "approved";

export type ArtifactSummary = {
  kind: ArtifactKind;
  status: ArtifactStatus;
  version: number;
  approvedVersion: number | null;
  staleReason: string | null;
  updatedAt: string | null;
};

export type ArtifactRecord<K extends ArtifactKind = ArtifactKind> = ArtifactSummary & {
  revision: number;
  data: ArtifactData[K];
  versions: { version: number; createdAt: string; provenance: Provenance }[];
};

export const uid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);
