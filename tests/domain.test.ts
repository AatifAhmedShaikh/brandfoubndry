import { describe, expect, it } from "vitest";
import { BriefSchema, VoiceSchema, briefGaps } from "../shared/schemas";
import { downstreamOf } from "../shared/workflow";
import { evaluate, voiceLint } from "../shared/consistency";
import { constructDirections, contrast, logoSvg } from "../shared/identity";
import { demoBrief, demoDirections, demoIdentity, demoNaming, demoPositioning, demoVoice } from "../shared/demo";
import { AI } from "../server/ai";

describe("brief validation", () => {
  it("lists the gaps that block approval", () => {
    expect(briefGaps(BriefSchema.parse({ idea: "short" }))).toEqual(["idea", "industry", "audience", "problem", "personality"]);
    expect(briefGaps(demoBrief)).toEqual([]);
  });
  it("trims input and enforces limits", () => {
    expect(BriefSchema.parse({ idea: "  hi  " }).idea).toBe("hi");
    expect(BriefSchema.safeParse({ values: Array(9).fill("v") }).success).toBe(false);
  });
});

describe("dependency graph", () => {
  it("returns transitive downstream artifacts in workflow order", () => {
    expect(downstreamOf("positioning")).toEqual(["voice", "naming", "identity", "challenge", "consistency"]);
    expect(downstreamOf("brief")[0]).toBe("research");
    expect(downstreamOf("consistency")).toEqual([]);
  });
});

describe("consistency rubric", () => {
  const base = { brief: demoBrief, positioning: demoPositioning, voice: demoVoice, naming: demoNaming, identity: demoIdentity, summaries: [] };

  it("passes the curated demo on deterministic rules", () => {
    const r = evaluate(base);
    expect(r.results.filter((x) => x.status === "fail")).toEqual([]);
  });

  it("detects personality/voice conflicts", () => {
    const r = evaluate({ ...base, voice: { ...demoVoice, sliders: { ...demoVoice.sliders, understated: 10 } } });
    expect(r.results.find((x) => x.ruleId === "personality-voice" && x.status === "fail")?.detail).toMatch(/Bold/);
  });

  it("detects banned vocabulary in strategy copy", () => {
    const r = evaluate({ ...base, voice: { ...demoVoice, taglines: ["Premium streetwear"] } });
    expect(r.results.some((x) => x.ruleId === "vocabulary-leak" && x.status === "fail")).toBe(true);
  });

  it("flags approved artifacts built on outdated inputs", () => {
    const r = evaluate({ ...base, summaries: [{ kind: "voice", status: "approved", version: 2, approvedVersion: 2, staleReason: "Positioning changed (v3)", updatedAt: null }] });
    expect(r.results.find((x) => x.ruleId === "stale-approvals")?.status).toBe("fail");
  });

  it("does not count rules that do not apply", () => {
    const r = evaluate({ brief: null, positioning: null, voice: null, naming: null, identity: null, summaries: [] });
    expect(r.total).toBe(0);
  });
});

describe("voice lint", () => {
  it("catches avoided words and tone clashes without AI", () => {
    const v = VoiceSchema.parse({ ...demoVoice, sliders: { ...demoVoice.sliders, playful: 80 } });
    const notes = voiceLint("Our premium tees are the best!!", v);
    expect(notes.map((n) => n.kind)).toEqual(expect.arrayContaining(["avoid", "tone"]));
  });
});

describe("identity", () => {
  it("computes WCAG contrast", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrast("#777777", "#777777")).toBe(1);
  });
  it("escapes names inside SVG output", () => {
    const svg = logoSvg(demoDirections[0], `<script>alert("x")</script>`);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;SCRIPT&gt;");
  });
  it("constructs three directions nearest to the voice", () => {
    const dirs = constructDirections({ playful: 90, traditional: 30, approachable: 90, understated: 20 });
    expect(dirs).toHaveLength(3);
    expect(dirs[0].name).toBe("Quiet authority");
    expect(dirs.every((d) => d.source === "constructed")).toBe(true);
  });
});

describe("AI output schemas", () => {
  it("accept well-formed output and reject malformed output", () => {
    expect(AI.voiceCheck.safeParse({ verdict: "fits", reasons: [], rewrite: "" }).success).toBe(true);
    expect(AI.voiceCheck.safeParse({ verdict: "great", reasons: [], rewrite: "" }).success).toBe(false);
    expect(AI.challenge.safeParse({ findings: [{ perspective: "investor", title: "t", severity: "high", basis: "evidence", evidence: "q", affected: "positioning", rationale: "r", action: "a" }] }).success).toBe(true);
    expect(AI.challenge.safeParse({ findings: [{ perspective: "alien" }] }).success).toBe(false);
  });
});
