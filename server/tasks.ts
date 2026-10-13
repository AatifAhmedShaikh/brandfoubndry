import { z } from "zod";
import { HEX, uid, type ArtifactKind, type Brief, type IdentityDirection, type Positioning, type Voice } from "../shared/schemas";
import { AI, AiError, SYSTEM, clip, input, type AiProvider } from "./ai";
import { HttpError, getArtifact, logActivity, saveArtifact, upstreamInputs } from "./artifacts";
import { type DB, id, now } from "./db";
import { activeDirection, brandName } from "./export";
import { loadBundle } from "./bundle";

export const AI_TASKS = ["brief-assist", "research", "positioning", "voice", "voice-check", "naming", "identity", "challenge", "consistency"] as const;
export type AiTask = (typeof AI_TASKS)[number];

const LIMIT = () => Number(process.env.AI_RATE_LIMIT ?? 20);

type Ctx = { db: DB; ai: AiProvider; userId: string; projectId: string; signal?: AbortSignal };

/** Runs one AI task end to end: rate limit → prompt → validated output → stored artifact. */
export async function runTask(ctx: Ctx, task: AiTask, body: Record<string, unknown>) {
  const { db, ai, userId, projectId } = ctx;
  if (!ai.configured) throw new HttpError(503, "AI is not configured on this server. Add ANTHROPIC_API_KEY to enable generation. You can keep editing everything by hand.", "ai_not_configured");
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const recent = db.get<{ n: number }>("SELECT COUNT(*) AS n FROM ai_usage WHERE user_id = ? AND created_at > ?", userId, since)!.n;
  if (recent >= LIMIT()) throw new HttpError(429, `You've reached ${LIMIT()} AI requests in 10 minutes. Try again shortly.`, "rate_limited");

  const record = (status: "ok" | "error" | "invalid" | "refused", usage = { input: 0, output: 0 }, error?: string) =>
    db.run("INSERT INTO ai_usage VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", id(), userId, projectId, task, ai.model, status, usage.input, usage.output, error ?? null, now());

  const call = async <T>(schema: z.ZodType<T>, prompt: string) => {
    try {
      const out = await ai.generate({ task, system: SYSTEM, prompt, schema, signal: ctx.signal });
      record("ok", out.usage);
      return out.data;
    } catch (e) {
      if (e instanceof AiError) {
        record(e.code === "refused" ? "refused" : e.code === "invalid" ? "invalid" : "error", e.usage, e.message);
        throw new HttpError(e.code === "rate_limited" ? 429 : e.code === "not_configured" ? 503 : 502, e.message, `ai_${e.code}`);
      }
      record("error", undefined, e instanceof Error ? e.name : "unknown");
      throw e;
    }
  };

  const save = <K extends ArtifactKind>(kind: K, data: unknown, note: string) => {
    const rec = saveArtifact(db, { projectId, kind, data, userId, provenance: { source: "ai", model: ai.model, task, note } });
    logActivity(db, userId, projectId, "generated", note);
    return rec;
  };

  const bundle = loadBundle(db, projectId);
  const name = brandName(bundle);

  switch (task) {
    case "brief-assist": {
      const brief = getArtifact(db, projectId, "brief").data;
      if (!brief.idea.trim()) throw new HttpError(422, "Describe the idea first.", "incomplete");
      const out = await call(AI.briefAssist, `Review this brand brief. Ask the follow-up questions that would most sharpen it, and for each empty or vague field propose one explicit assumption the founder can accept or dismiss.\n\n${input("brief", { ...brief, assumptions: undefined })}`);
      const next: Brief = {
        ...brief,
        openQuestions: out.questions.slice(0, 6).map((q) => clip(q, 300)),
        assumptions: [...brief.assumptions.filter((a) => a.status !== "open"), ...out.assumptions.slice(0, 8).map((a) => ({ id: uid(), field: a.field, text: clip(a.text, 600), status: "open" as const }))].slice(0, 20),
      };
      return save("brief", next, "Generated follow-up questions and assumptions for the brief");
    }

    case "research": {
      const competitors = db.all("SELECT name, url, positioning, audience, messaging, differentiation, visual_notes, notes FROM competitors WHERE project_id = ?", projectId);
      const sources = db.all("SELECT url, title, excerpt FROM research_sources WHERE project_id = ?", projectId);
      if (!competitors.length) throw new HttpError(422, "Add at least one competitor first.", "incomplete");
      const { inputs } = upstreamInputs(db, projectId, "research");
      const out = await call(
        AI.research,
        `Analyse the competitive landscape using ONLY the competitor notes and sources the user entered. Mark a pattern or gap "entered-evidence" only when it follows directly from those notes; otherwise mark it "ai-hypothesis". Do not add competitors or facts that were not supplied.\n\n${input("brief", inputs.brief)}\n${input("competitors", competitors)}\n${input("sources", sources)}`,
      );
      return save("research", { summary: clip(out.summary, 1500), patterns: out.patterns.slice(0, 16).map((p) => ({ ...p, observation: clip(p.observation, 600), competitors: p.competitors.slice(0, 10).map((c) => clip(c, 120)) })), gaps: out.gaps.slice(0, 10).map((g) => ({ ...g, gap: clip(g.gap, 300), rationale: clip(g.rationale, 600) })) }, "Generated competitor analysis");
    }

    case "positioning": {
      const { inputs } = upstreamInputs(db, projectId, "positioning");
      if (!inputs.brief?.idea) throw new HttpError(422, "Complete the brief first.", "incomplete");
      const out = await call(
        AI.positioning,
        `Develop exactly three meaningfully different positioning directions for ${JSON.stringify(name)}. They must differ in audience focus or core claim, not just wording. Each needs concrete differentiators, honest trade-offs and risks, and messaging implications. The statement should follow "For [audience] who [need], ${name} is the [frame] that [benefit]".\n\n${input("brief", inputs.brief)}\n${inputs.research ? input("research", inputs.research) : "No competitor research has been entered."}`,
      );
      const existing = getArtifact(db, projectId, "positioning").data;
      const directions = out.directions.slice(0, 3).map((d) => ({ ...d, id: uid() }));
      return save("positioning", { directions, selectedId: null, final: existing.final } satisfies Positioning, "Generated three positioning directions");
    }

    case "voice": {
      const { inputs } = upstreamInputs(db, projectId, "voice");
      if (!inputs.positioning?.final) throw new HttpError(422, "Choose a positioning direction first.", "incomplete");
      const current = getArtifact(db, projectId, "voice").data;
      const out = await call(
        AI.voice,
        `Write tone-of-voice guidelines for ${JSON.stringify(name)}. Calibrate to the personality sliders (0 = left pole, 100 = right pole): playful↔serious ${current.sliders.playful}, traditional↔experimental ${current.sliders.traditional}, approachable↔premium ${current.sliders.approachable}, understated↔bold ${current.sliders.understated}. Give 3 principles with concrete do/don't lines, 3 messaging pillars, vocabulary to use and avoid, 4 taglines, website hero copy and 2 social posts. Social posts must not contain invented facts, numbers or quotes.\n\n${input("brief", inputs.brief)}\n${input("positioning", inputs.positioning.final)}`,
      );
      return save("voice", { ...out, sliders: current.sliders } satisfies Partial<Voice>, "Generated voice guidelines");
    }

    case "voice-check": {
      const text = z.string().trim().min(3).max(3000).parse(body.text);
      const voice = getArtifact(db, projectId, "voice");
      if (voice.status === "empty") throw new HttpError(422, "Write or generate voice guidelines first.", "incomplete");
      return call(AI.voiceCheck, `Does this text fit the brand voice? Quote the exact phrases that work against it, explain why, suggest a fix for each, then provide a rewrite in the voice.\n\n${input("voice", voice.data)}\n${input("text", text)}`);
    }

    case "naming": {
      const { inputs } = upstreamInputs(db, projectId, "naming");
      const existing = db.all<{ name: string }>("SELECT name FROM naming_candidates WHERE project_id = ?", projectId).map((r) => r.name);
      const criteria = getArtifact(db, projectId, "naming").data.criteria;
      const out = await call(
        AI.naming,
        `Propose 8 brand name candidates across different naming styles. For each give the rationale, a pronunciation guide, and honest drawbacks (including likely confusion with common words). Do not claim any name is available or trademark-free; you cannot check that. Avoid these existing candidates: ${JSON.stringify(existing)}.\n\n${input("brief", inputs.brief ?? getArtifact(db, projectId, "brief").data)}\n${inputs.positioning ? input("positioning", inputs.positioning.final) : ""}\n${inputs.voice ? input("voice", { summary: inputs.voice.summary, sliders: inputs.voice.sliders }) : ""}\n${input("criteria", criteria)}`,
      );
      let added = 0;
      for (const c of out.candidates.slice(0, 10)) {
        const nm = clip(c.name.trim(), 40);
        if (!nm || existing.some((e) => e.toLowerCase() === nm.toLowerCase())) continue;
        db.run("INSERT OR IGNORE INTO naming_candidates (id, project_id, name, style, rationale, pronunciation, drawbacks, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'ai', ?)", id(), projectId, nm, c.style, clip(c.rationale, 600), clip(c.pronunciation, 80), clip(c.drawbacks, 600), now());
        added++;
      }
      logActivity(db, userId, projectId, "generated", `Generated ${added} name candidates`);
      return { added };
    }

    case "identity": {
      const { inputs } = upstreamInputs(db, projectId, "identity");
      if (!inputs.positioning?.final) throw new HttpError(422, "Choose a positioning direction first.", "incomplete");
      const out = await call(
        AI.identity,
        `Design three distinct visual identity directions for ${JSON.stringify(name)}. Each needs a palette of five #RRGGBB colours where ink on paper reaches at least 4.5:1 contrast, a display and text typeface from the allowed list, a mark style, wordmark settings, a graphic motif, and a concrete image direction. Explain how each choice follows from the positioning and voice.\n\n${input("positioning", inputs.positioning.final)}\n${inputs.voice ? input("voice", { summary: inputs.voice.summary, sliders: inputs.voice.sliders, pillars: inputs.voice.pillars }) : ""}`,
      );
      const valid: IdentityDirection[] = out.directions
        .filter((d) => Object.values(d.palette).every((h) => HEX.safeParse(h).success))
        .slice(0, 3)
        .map((d) => ({ ...d, id: uid(), name: clip(d.name, 60), rationale: clip(d.rationale, 800), imageDirection: clip(d.imageDirection, 800), source: "ai" as const, wordmark: { case: d.wordmark.case, tracking: Math.max(-0.08, Math.min(0.4, d.wordmark.tracking)), weight: Number(d.wordmark.weight) as 400 | 500 | 600 | 700 } }));
      if (!valid.length) throw new HttpError(502, "The generated palettes were not valid colours. Nothing was saved. Try again.", "ai_invalid");
      const current = getArtifact(db, projectId, "identity").data;
      return save("identity", { ...current, directions: [...valid, ...current.directions.filter((d) => d.source !== "ai")].slice(0, 6), activeId: valid[0].id }, "Generated three identity directions");
    }

    case "challenge": {
      const d = activeDirection(bundle.identity);
      const out = await call(
        AI.challenge,
        `Critique this brand as four people: a sceptical target customer, a senior brand strategist, a design director and an early-stage investor. Find weak differentiation, confusing positioning, credibility gaps, inconsistencies and practical risks. Mark a finding "evidence" only when you can quote the artifact text it is about; otherwise mark it "judgment". Every finding needs a concrete next action. 6–10 findings, no padding.\n\n${input("brief", bundle.brief)}\n${input("positioning", bundle.positioning?.final)}\n${input("voice", bundle.voice && { summary: bundle.voice.summary, taglines: bundle.voice.taglines, websiteCopy: bundle.voice.websiteCopy })}\n${input("name", name)}\n${input("identity", d && { name: d.name, rationale: d.rationale, palette: d.palette, typography: d.typography })}`,
      );
      return save("challenge", { findings: out.findings.slice(0, 12).map((f) => ({ ...f, id: uid(), title: clip(f.title, 160), evidence: clip(f.evidence, 600), rationale: clip(f.rationale, 800), action: clip(f.action, 600), resolved: false })) }, "Generated a four-perspective critique");
    }

    case "consistency": {
      const d = activeDirection(bundle.identity);
      const out = await call(
        AI.consistency,
        `Check whether these artifacts agree with each other semantically: does the voice fit the audience, does the visual identity express the positioning, do taglines deliver the brand promise? Report only real contradictions, each naming the artifacts involved and how to resolve it. Return an empty list if there are none.\n\n${input("brief", bundle.brief && { audience: bundle.brief.audience, personality: bundle.brief.personality, values: bundle.brief.values })}\n${input("positioning", bundle.positioning?.final)}\n${input("voice", bundle.voice && { summary: bundle.voice.summary, sliders: bundle.voice.sliders, taglines: bundle.voice.taglines })}\n${input("identity", d && { name: d.name, rationale: d.rationale, typography: d.typography, imageDirection: d.imageDirection })}`,
      );
      return out.findings.slice(0, 10);
    }
  }
}
