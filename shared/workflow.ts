import type { ArtifactKind, ArtifactSummary } from "./schemas";

/** Direct upstream dependencies of each artifact. */
export const DEPENDENCIES: Record<ArtifactKind, ArtifactKind[]> = {
  brief: [],
  research: ["brief"],
  positioning: ["brief", "research"],
  voice: ["brief", "positioning"],
  naming: ["positioning", "voice"],
  identity: ["positioning", "voice", "naming"],
  challenge: ["positioning", "voice", "naming", "identity"],
  consistency: ["brief", "positioning", "voice", "naming", "identity"],
};

/** Every artifact that depends on `kind`, directly or transitively, in workflow order. */
export function downstreamOf(kind: ArtifactKind): ArtifactKind[] {
  const out = new Set<ArtifactKind>();
  const visit = (k: ArtifactKind) => {
    for (const [child, deps] of Object.entries(DEPENDENCIES) as [ArtifactKind, ArtifactKind[]][]) {
      if (deps.includes(k) && !out.has(child)) {
        out.add(child);
        visit(child);
      }
    }
  };
  visit(kind);
  return WORKFLOW_ORDER.filter((k) => out.has(k));
}

export const WORKFLOW_ORDER: ArtifactKind[] = ["brief", "research", "positioning", "voice", "naming", "identity", "challenge", "consistency"];

export type StageDef = {
  n: string;
  key: string;
  label: string;
  pages: { path: string; label: string; artifact: ArtifactKind | null; blurb: string }[];
};

/** DISCOVER → RESEARCH → POSITION → SHAPE → VISUALIZE → CHALLENGE → VALIDATE → PUBLISH */
export const STAGES: StageDef[] = [
  { n: "01", key: "discover", label: "Discover", pages: [{ path: "discover", label: "Brand brief", artifact: "brief", blurb: "Turn the idea into a structured brief." }] },
  { n: "02", key: "research", label: "Research", pages: [{ path: "research", label: "Competitors", artifact: "research", blurb: "Map the market you are entering." }] },
  { n: "03", key: "position", label: "Position", pages: [{ path: "position", label: "Directions", artifact: "positioning", blurb: "Choose what the brand stands for." }] },
  {
    n: "04",
    key: "shape",
    label: "Shape",
    pages: [
      { path: "voice", label: "Voice", artifact: "voice", blurb: "Set personality and tone." },
      { path: "naming", label: "Naming", artifact: "naming", blurb: "Find and shortlist names." },
    ],
  },
  { n: "05", key: "visualize", label: "Visualize", pages: [{ path: "visuals", label: "Identity studio", artifact: "identity", blurb: "Build the visual system." }] },
  { n: "06", key: "challenge", label: "Challenge", pages: [{ path: "challenge", label: "Critique", artifact: "challenge", blurb: "Stress-test the brand." }] },
  { n: "07", key: "validate", label: "Validate", pages: [{ path: "consistency", label: "Consistency", artifact: "consistency", blurb: "Check the system agrees with itself." }] },
  { n: "08", key: "publish", label: "Publish", pages: [{ path: "brand-kit", label: "Brand kit", artifact: null, blurb: "Export guidelines and assets." }] },
];

export const PAGES = STAGES.flatMap((s) => s.pages.map((p) => ({ ...p, stage: s })));

export const KIND_LABEL: Record<ArtifactKind, string> = {
  brief: "Brand brief",
  research: "Competitor research",
  positioning: "Positioning",
  voice: "Voice",
  naming: "Naming",
  identity: "Visual identity",
  challenge: "Critique",
  consistency: "Consistency",
};

export const KIND_PATH: Record<ArtifactKind, string> = Object.fromEntries(
  PAGES.filter((p) => p.artifact).map((p) => [p.artifact, p.path]),
) as Record<ArtifactKind, string>;

/** The core strategy artifacts a project needs approved before its kit is "complete". */
export const CORE_KINDS: ArtifactKind[] = ["brief", "positioning", "voice", "naming", "identity"];

export function progress(summaries: ArtifactSummary[]) {
  const by = new Map(summaries.map((s) => [s.kind, s]));
  const approved = CORE_KINDS.filter((k) => by.get(k)?.status === "approved").length;
  const stale = summaries.filter((s) => s.staleReason).length;
  // Point at the next unapproved core stage first; research and the checks are optional.
  const pending = (p: (typeof PAGES)[number]) => p.artifact && by.get(p.artifact)?.status !== "approved";
  const next = PAGES.find((p) => pending(p) && CORE_KINDS.includes(p.artifact!)) ?? PAGES.find(pending);
  return { approved, total: CORE_KINDS.length, stale, next };
}
