import { Hono, type Context } from "hono";
import { z } from "zod";
import { ArtifactKindSchema, BriefSchema, CompetitorInputSchema, NamingCandidateInputSchema, NamingCandidatePatchSchema, SourceInputSchema, type ArtifactKind, type Competitor, type NamingCandidate } from "../shared/schemas";
import { evaluate } from "../shared/consistency";
import { progress } from "../shared/workflow";
import { demoBrief, demoChallenge, demoCompetitors, demoIdentity, demoNaming, demoNamingCandidates, demoPositioning, demoVoice, DEMO_NAME } from "../shared/demo";
import { type AiProvider } from "./ai";
import { HttpError, acknowledgeArtifact, approveArtifact, getArtifact, getVersion, logActivity, saveArtifact, summaries, unapproveArtifact } from "./artifacts";
import { type Env, createGuest, createSession, destroySession, hashPassword, loginLocked, recordLogin, requireUser, session, verifyPassword } from "./auth";
import { listFindings, loadBundle } from "./bundle";
import { type DB, id, now } from "./db";
import { EXPORT_FILES, activeDirection, cssVariables, guidelinesPdf, logoFile, strategyMarkdown, tokensJson, type ExportFile } from "./export";
import { AI_TASKS, runTask, type AiTask } from "./tasks";

const json = async <T>(c: Context<Env>, schema: z.ZodType<T>): Promise<T> => {
  const raw = await c.req.json().catch(() => {
    throw new HttpError(400, "Request body must be JSON", "bad_json");
  });
  return schema.parse(raw);
};

const Email = z.email().max(200).transform((s) => s.toLowerCase().trim());
const Password = z.string().min(8, "Use at least 8 characters").max(200);

type ProjectRow = { id: string; name: string; is_demo: number; created_at: string; updated_at: string };

export function createApp({ db, ai }: { db: DB; ai: AiProvider }) {
  const app = new Hono<Env>();

  app.use("/api/*", async (c, next) => {
    c.set("db", db);
    // Mutations must be JSON: blocks cross-site form posts in addition to SameSite=Lax cookies.
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && !c.req.header("content-type")?.startsWith("application/json"))
      return c.json({ error: "Expected application/json", code: "unsupported_media_type" }, 415);
    await next();
  });
  app.use("/api/*", session);

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message, code: err.code, ...err.extra }, err.status);
    if (err instanceof z.ZodError) return c.json({ error: err.issues[0]?.message ?? "Invalid input", code: "invalid", issues: err.issues.slice(0, 10) }, 422);
    if (err instanceof Error && err.name === "APIUserAbortError") return c.json({ error: "Request cancelled", code: "cancelled" }, 400);
    console.error("[api]", c.req.method, c.req.path, err);
    return c.json({ error: "Something went wrong on our side. Your saved work is unaffected.", code: "internal" }, 500);
  });

  const userId = (c: Context<Env>) => c.var.user!.id;
  const ownProject = (c: Context<Env>) => {
    const p = db.get<ProjectRow>("SELECT id, name, is_demo, created_at, updated_at FROM projects WHERE id = ? AND user_id = ?", c.req.param("pid")!, userId(c));
    // 404 rather than 403 so project ids cannot be probed.
    if (!p) throw new HttpError(404, "Project not found", "not_found");
    return p;
  };
  const kindParam = (c: Context<Env>) => {
    const k = ArtifactKindSchema.safeParse(c.req.param("kind"));
    if (!k.success) throw new HttpError(404, "Unknown artifact", "not_found");
    return k.data;
  };
  const projectView = (p: ProjectRow) => {
    const s = summaries(db, p.id);
    const identity = getArtifact(db, p.id, "identity");
    const brand = { name: getArtifact(db, p.id, "naming").data.chosen || p.name, direction: identity.status === "empty" ? null : activeDirection(identity.data) };
    return { id: p.id, name: p.name, isDemo: p.is_demo === 1, createdAt: p.created_at, updatedAt: p.updated_at, summaries: s, progress: progress(s), brand };
  };

  /* ── Session & account ─────────────────────────────────────────── */

  app.get("/api/session", (c) => c.json({ user: c.var.user, ai: { configured: ai.configured, model: ai.model } }));

  app.post("/api/auth/guest", (c) => c.json({ user: c.var.user ?? createGuest(c) }));

  app.post("/api/auth/register", async (c) => {
    const b = await json(c, z.object({ email: Email, password: Password, displayName: z.string().trim().max(80).default("") }));
    if (db.get("SELECT 1 FROM users WHERE email = ?", b.email)) throw new HttpError(409, "An account with this email already exists. Sign in instead.", "exists");
    const hash = await hashPassword(b.password);
    const current = c.var.user;
    let uid: string;
    if (current?.isGuest) {
      // Claim the guest workspace: projects stay exactly where they are.
      uid = current.id;
      db.run("UPDATE users SET email = ?, password_hash = ?, display_name = ?, is_guest = 0 WHERE id = ?", b.email, hash, b.displayName, uid);
      db.run("DELETE FROM sessions WHERE user_id = ?", uid);
    } else {
      uid = id();
      db.run("INSERT INTO users VALUES (?, ?, ?, ?, 0, ?, ?)", uid, b.email, hash, b.displayName, now(), now());
    }
    createSession(c, uid);
    logActivity(db, uid, null, "account", "Created an account");
    return c.json({ user: { id: uid, email: b.email, displayName: b.displayName, isGuest: false } });
  });

  app.post("/api/auth/login", async (c) => {
    const b = await json(c, z.object({ email: Email, password: z.string().max(200) }));
    if (loginLocked(b.email)) throw new HttpError(429, "Too many attempts. Try again in 15 minutes.", "locked");
    const u = db.get<{ id: string; password_hash: string; display_name: string }>("SELECT id, password_hash, display_name FROM users WHERE email = ? AND is_guest = 0", b.email);
    const ok = !!u && (await verifyPassword(b.password, u.password_hash));
    recordLogin(b.email, ok);
    if (!ok) throw new HttpError(401, "Email or password is incorrect.", "bad_credentials");
    const guest = c.var.user?.isGuest ? c.var.user : null;
    if (guest) {
      // Bring any guest work into the account the visitor just signed in to.
      db.tx(() => {
        db.run("UPDATE projects SET user_id = ? WHERE user_id = ?", u!.id, guest.id);
        db.run("UPDATE activity_events SET user_id = ? WHERE user_id = ?", u!.id, guest.id);
        db.run("UPDATE artifact_versions SET created_by = ? WHERE created_by = ?", u!.id, guest.id);
        db.run("DELETE FROM users WHERE id = ?", guest.id);
      });
    }
    createSession(c, u!.id);
    return c.json({ user: { id: u!.id, email: b.email, displayName: u!.display_name, isGuest: false } });
  });

  app.post("/api/auth/logout", (c) => {
    destroySession(c);
    return c.json({ ok: true });
  });

  app.patch("/api/me", requireUser, async (c) => {
    const b = await json(c, z.object({ displayName: z.string().trim().max(80) }));
    db.run("UPDATE users SET display_name = ? WHERE id = ?", b.displayName, userId(c));
    return c.json({ user: { ...c.var.user!, displayName: b.displayName } });
  });

  app.post("/api/me/password", requireUser, async (c) => {
    const b = await json(c, z.object({ current: z.string().max(200), next: Password }));
    const u = db.get<{ password_hash: string | null }>("SELECT password_hash FROM users WHERE id = ?", userId(c))!;
    if (!u.password_hash || !(await verifyPassword(b.current, u.password_hash))) throw new HttpError(401, "Current password is incorrect.", "bad_credentials");
    db.run("UPDATE users SET password_hash = ? WHERE id = ?", await hashPassword(b.next), userId(c));
    db.run("DELETE FROM sessions WHERE user_id = ?", userId(c));
    createSession(c, userId(c));
    return c.json({ ok: true });
  });

  app.delete("/api/me", requireUser, async (c) => {
    await json(c, z.object({ confirm: z.literal("DELETE") }));
    db.run("DELETE FROM users WHERE id = ?", userId(c));
    destroySession(c);
    return c.json({ ok: true });
  });

  app.get("/api/me/usage", requireUser, (c) => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const r = db.get<{ n: number; i: number; o: number }>("SELECT COUNT(*) n, COALESCE(SUM(input_tokens),0) i, COALESCE(SUM(output_tokens),0) o FROM ai_usage WHERE user_id = ? AND created_at > ?", userId(c), since)!;
    return c.json({ requests: r.n, inputTokens: r.i, outputTokens: r.o });
  });

  /* ── Projects ──────────────────────────────────────────────────── */

  app.get("/api/projects", requireUser, (c) => {
    const q = (c.req.query("q") ?? "").trim().toLowerCase();
    const rows = db.all<ProjectRow>("SELECT id, name, is_demo, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC", userId(c));
    return c.json({ projects: rows.filter((p) => !q || p.name.toLowerCase().includes(q)).map(projectView) });
  });

  app.post("/api/projects", requireUser, async (c) => {
    const b = await json(c, z.object({ name: z.string().trim().min(1, "Give the project a working name").max(80), brief: BriefSchema.partial().optional() }));
    const pid = id();
    db.run("INSERT INTO projects VALUES (?, ?, ?, 0, ?, ?)", pid, userId(c), b.name, now(), now());
    if (b.brief && Object.values(b.brief).some((v) => (Array.isArray(v) ? v.length : v)))
      saveArtifact(db, { projectId: pid, kind: "brief", data: BriefSchema.parse(b.brief), userId: userId(c), provenance: { source: "manual", note: "Started from the new project form" } });
    logActivity(db, userId(c), pid, "created", `Created project ${b.name}`);
    return c.json({ project: projectView(db.get<ProjectRow>("SELECT * FROM projects WHERE id = ?", pid)!) }, 201);
  });

  /** Seeds the fictional KORA project into the visitor's workspace (creating a guest session if needed). */
  app.post("/api/demo", (c) => {
    const user = c.var.user ?? createGuest(c);
    const existing = db.get<{ id: string }>("SELECT id FROM projects WHERE user_id = ? AND is_demo = 1 ORDER BY created_at DESC", user.id);
    if (existing) return c.json({ id: existing.id });
    const pid = id();
    const prov = { source: "demo" as const, note: "Curated demonstration content (fictional brand)" };
    db.tx(() => {
      db.run("INSERT INTO projects VALUES (?, ?, ?, 1, ?, ?)", pid, user.id, DEMO_NAME, now(), now());
      for (const cpt of demoCompetitors)
        db.run("INSERT INTO competitors VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", id(), pid, cpt.name, cpt.url, cpt.positioning, cpt.audience, cpt.messaging, cpt.differentiation, cpt.visualNotes, cpt.notes, now());
      for (const n of demoNamingCandidates)
        db.run("INSERT INTO naming_candidates (id, project_id, name, style, rationale, pronunciation, drawbacks, status, favorite, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?)", id(), pid, n.name, n.style, n.rationale, n.pronunciation, n.drawbacks, n.name === "KORA" ? "shortlisted" : "candidate", n.name === "KORA" ? 1 : 0, now());
    });
    const seq: [ArtifactKind, unknown, boolean][] = [["brief", demoBrief, true], ["positioning", demoPositioning, true], ["voice", demoVoice, true], ["naming", demoNaming, true], ["identity", demoIdentity, false], ["challenge", demoChallenge, false]];
    for (const [kind, data, approve] of seq) {
      saveArtifact(db, { projectId: pid, kind, data, userId: user.id, provenance: prov });
      if (approve) approveArtifact(db, pid, kind, user.id);
    }
    logActivity(db, user.id, pid, "created", "Opened the KORA demo project");
    return c.json({ id: pid }, 201);
  });

  app.get("/api/activity", requireUser, (c) => {
    const limit = Math.min(Number(c.req.query("limit") ?? 12) || 12, 50);
    const rows = db.all("SELECT a.id, a.type, a.message, a.created_at AS createdAt, a.project_id AS projectId, p.name AS projectName FROM activity_events a LEFT JOIN projects p ON p.id = a.project_id WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT ?", userId(c), limit);
    return c.json({ activity: rows });
  });

  app.use("/api/projects/:pid", requireUser);
  app.use("/api/projects/:pid/*", requireUser);

  app.get("/api/projects/:pid", (c) => c.json({ project: projectView(ownProject(c)) }));

  app.patch("/api/projects/:pid", async (c) => {
    const p = ownProject(c);
    const b = await json(c, z.object({ name: z.string().trim().min(1).max(80) }));
    db.run("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?", b.name, now(), p.id);
    logActivity(db, userId(c), p.id, "renamed", `Renamed project to ${b.name}`);
    return c.json({ project: projectView({ ...p, name: b.name }) });
  });

  app.delete("/api/projects/:pid", (c) => {
    const p = ownProject(c);
    db.run("DELETE FROM projects WHERE id = ?", p.id);
    logActivity(db, userId(c), null, "deleted", `Deleted project ${p.name}`);
    return c.json({ ok: true });
  });

  app.get("/api/projects/:pid/activity", (c) => {
    const p = ownProject(c);
    return c.json({ activity: db.all("SELECT id, type, message, created_at AS createdAt FROM activity_events WHERE project_id = ? ORDER BY created_at DESC LIMIT 30", p.id) });
  });

  /* ── Artifacts ─────────────────────────────────────────────────── */

  app.get("/api/projects/:pid/artifacts/:kind", (c) => c.json({ artifact: getArtifact(db, ownProject(c).id, kindParam(c)) }));

  app.put("/api/projects/:pid/artifacts/:kind", async (c) => {
    const p = ownProject(c);
    const kind = kindParam(c);
    const b = await json(c, z.object({ data: z.unknown(), baseRevision: z.number().int().optional(), coalesce: z.boolean().default(false), source: z.enum(["manual", "rules"]).default("manual"), note: z.string().max(200).optional() }));
    const before = getArtifact(db, p.id, kind);
    const artifact = saveArtifact(db, { projectId: p.id, kind, data: b.data, userId: userId(c), baseRevision: b.baseRevision, coalesce: b.coalesce, provenance: { source: b.source, note: b.note } });
    if (artifact.version !== before.version) logActivity(db, userId(c), p.id, "edited", b.note ?? `Saved ${kind} v${artifact.version}`);
    return c.json({ artifact });
  });

  app.get("/api/projects/:pid/artifacts/:kind/versions/:v", (c) => c.json({ version: getVersion(db, ownProject(c).id, kindParam(c), Number(c.req.param("v"))) }));

  app.post("/api/projects/:pid/artifacts/:kind/restore", async (c) => {
    const p = ownProject(c);
    const kind = kindParam(c);
    const b = await json(c, z.object({ version: z.number().int().positive() }));
    const v = getVersion(db, p.id, kind, b.version);
    const artifact = saveArtifact(db, { projectId: p.id, kind, data: v.data, userId: userId(c), provenance: { source: "restore", note: `Restored from v${b.version}` } });
    logActivity(db, userId(c), p.id, "restored", `Restored ${kind} v${b.version}`);
    return c.json({ artifact });
  });

  for (const [action, fn] of [["approve", approveArtifact], ["unapprove", unapproveArtifact], ["acknowledge", acknowledgeArtifact]] as const)
    app.post(`/api/projects/:pid/artifacts/:kind/${action}`, (c) => c.json({ artifact: fn(db, ownProject(c).id, kindParam(c), userId(c)) }));

  /* ── Research ──────────────────────────────────────────────────── */

  type CompetitorRow = { id: string; name: string; url: string; positioning: string; audience: string; messaging: string; differentiation: string; visual_notes: string; notes: string; created_at: string };
  const toCompetitor = (r: CompetitorRow): Competitor => ({ id: r.id, name: r.name, url: r.url, positioning: r.positioning, audience: r.audience, messaging: r.messaging, differentiation: r.differentiation, visualNotes: r.visual_notes, notes: r.notes, createdAt: r.created_at });

  app.get("/api/projects/:pid/competitors", (c) => {
    const p = ownProject(c);
    return c.json({
      competitors: db.all<CompetitorRow>("SELECT * FROM competitors WHERE project_id = ? ORDER BY created_at", p.id).map(toCompetitor),
      sources: db.all("SELECT id, competitor_id AS competitorId, url, title, excerpt, created_at AS createdAt FROM research_sources WHERE project_id = ? ORDER BY created_at", p.id),
    });
  });

  app.post("/api/projects/:pid/competitors", async (c) => {
    const p = ownProject(c);
    const b = await json(c, CompetitorInputSchema);
    if ((db.get<{ n: number }>("SELECT COUNT(*) n FROM competitors WHERE project_id = ?", p.id)!.n) >= 12) throw new HttpError(422, "Up to 12 competitors per project.", "limit");
    const cid = id();
    db.run("INSERT INTO competitors VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", cid, p.id, b.name, b.url, b.positioning, b.audience, b.messaging, b.differentiation, b.visualNotes, b.notes, now());
    logActivity(db, userId(c), p.id, "research", `Added competitor ${b.name}`);
    return c.json({ competitor: toCompetitor(db.get<CompetitorRow>("SELECT * FROM competitors WHERE id = ?", cid)!) }, 201);
  });

  app.patch("/api/projects/:pid/competitors/:cid", async (c) => {
    const p = ownProject(c);
    const b = await json(c, CompetitorInputSchema);
    const r = db.run("UPDATE competitors SET name=?, url=?, positioning=?, audience=?, messaging=?, differentiation=?, visual_notes=?, notes=? WHERE id = ? AND project_id = ?", b.name, b.url, b.positioning, b.audience, b.messaging, b.differentiation, b.visualNotes, b.notes, c.req.param("cid"), p.id);
    if (!r.changes) throw new HttpError(404, "Competitor not found", "not_found");
    return c.json({ competitor: toCompetitor(db.get<CompetitorRow>("SELECT * FROM competitors WHERE id = ?", c.req.param("cid"))!) });
  });

  app.delete("/api/projects/:pid/competitors/:cid", (c) => {
    const p = ownProject(c);
    db.run("DELETE FROM competitors WHERE id = ? AND project_id = ?", c.req.param("cid"), p.id);
    return c.json({ ok: true });
  });

  app.post("/api/projects/:pid/sources", async (c) => {
    const p = ownProject(c);
    const b = await json(c, SourceInputSchema);
    if (b.competitorId && !db.get("SELECT 1 FROM competitors WHERE id = ? AND project_id = ?", b.competitorId, p.id)) throw new HttpError(404, "Competitor not found", "not_found");
    const sid = id();
    db.run("INSERT INTO research_sources VALUES (?, ?, ?, ?, ?, ?, 'user', ?)", sid, p.id, b.competitorId, b.url, b.title, b.excerpt, now());
    return c.json({ source: { id: sid, ...b, createdAt: now() } }, 201);
  });

  app.delete("/api/projects/:pid/sources/:sid", (c) => {
    db.run("DELETE FROM research_sources WHERE id = ? AND project_id = ?", c.req.param("sid"), ownProject(c).id);
    return c.json({ ok: true });
  });

  /* ── Naming ────────────────────────────────────────────────────── */

  type NameRow = { id: string; name: string; style: NamingCandidate["style"]; rationale: string; pronunciation: string; drawbacks: string; status: NamingCandidate["status"]; favorite: number; rejection_note: string; source: "ai" | "user"; created_at: string };
  const toName = (r: NameRow): NamingCandidate => ({ id: r.id, name: r.name, style: r.style, rationale: r.rationale, pronunciation: r.pronunciation, drawbacks: r.drawbacks, status: r.status, favorite: r.favorite === 1, rejectionNote: r.rejection_note, source: r.source, createdAt: r.created_at });

  app.get("/api/projects/:pid/names", (c) => c.json({ names: db.all<NameRow>("SELECT * FROM naming_candidates WHERE project_id = ? ORDER BY favorite DESC, created_at", ownProject(c).id).map(toName) }));

  app.post("/api/projects/:pid/names", async (c) => {
    const p = ownProject(c);
    const b = await json(c, NamingCandidateInputSchema);
    if (db.get("SELECT 1 FROM naming_candidates WHERE project_id = ? AND lower(name) = lower(?)", p.id, b.name)) throw new HttpError(409, "That name is already on the list.", "exists");
    const nid = id();
    db.run("INSERT INTO naming_candidates (id, project_id, name, style, rationale, pronunciation, drawbacks, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'user', ?)", nid, p.id, b.name, b.style, b.rationale, b.pronunciation, b.drawbacks, now());
    return c.json({ name: toName(db.get<NameRow>("SELECT * FROM naming_candidates WHERE id = ?", nid)!) }, 201);
  });

  app.patch("/api/projects/:pid/names/:nid", async (c) => {
    const p = ownProject(c);
    const b = await json(c, NamingCandidatePatchSchema);
    const cur = db.get<NameRow>("SELECT * FROM naming_candidates WHERE id = ? AND project_id = ?", c.req.param("nid"), p.id);
    if (!cur) throw new HttpError(404, "Name not found", "not_found");
    db.run(
      "UPDATE naming_candidates SET status = ?, favorite = ?, rejection_note = ?, rationale = ?, drawbacks = ? WHERE id = ?",
      b.status ?? cur.status,
      b.favorite === undefined ? cur.favorite : b.favorite ? 1 : 0,
      b.rejectionNote ?? cur.rejection_note,
      b.rationale ?? cur.rationale,
      b.drawbacks ?? cur.drawbacks,
      cur.id,
    );
    return c.json({ name: toName(db.get<NameRow>("SELECT * FROM naming_candidates WHERE id = ?", cur.id)!) });
  });

  app.delete("/api/projects/:pid/names/:nid", (c) => {
    db.run("DELETE FROM naming_candidates WHERE id = ? AND project_id = ?", c.req.param("nid"), ownProject(c).id);
    return c.json({ ok: true });
  });

  /* ── Validation ────────────────────────────────────────────────── */

  app.get("/api/projects/:pid/findings", (c) => c.json({ findings: listFindings(db, ownProject(c).id) }));

  app.patch("/api/projects/:pid/findings/:fid", async (c) => {
    const p = ownProject(c);
    const b = await json(c, z.object({ status: z.enum(["open", "resolved", "dismissed"]) }));
    const r = db.run("UPDATE validation_findings SET status = ? WHERE id = ? AND project_id = ?", b.status, c.req.param("fid"), p.id);
    if (!r.changes) throw new HttpError(404, "Finding not found", "not_found");
    return c.json({ ok: true });
  });

  app.post("/api/projects/:pid/consistency/run", async (c) => {
    const p = ownProject(c);
    const b = await json(c, z.object({ ai: z.boolean().default(false) }));
    const bundle = loadBundle(db, p.id);
    const rubric = evaluate(bundle);
    const aiFindings = b.ai ? await runTask({ db, ai, userId: userId(c), projectId: p.id, signal: c.req.raw.signal }, "consistency", {}) : null;
    db.tx(() => {
      // Re-running replaces open findings from the same source; resolved/dismissed history stays.
      db.run("DELETE FROM validation_findings WHERE project_id = ? AND source = 'rule' AND status = 'open'", p.id);
      for (const r of rubric.results.filter((x) => x.status === "fail"))
        db.run("INSERT INTO validation_findings VALUES (?, ?, 'rule', ?, ?, ?, ?, ?, ?, 'open', ?)", id(), p.id, r.ruleId, r.severity, r.title, r.detail, JSON.stringify(r.artifacts), r.resolution, now());
      if (Array.isArray(aiFindings)) {
        db.run("DELETE FROM validation_findings WHERE project_id = ? AND source = 'ai' AND status = 'open'", p.id);
        for (const f of aiFindings) db.run("INSERT INTO validation_findings VALUES (?, ?, 'ai', NULL, ?, ?, ?, ?, ?, 'open', ?)", id(), p.id, f.severity, f.title.slice(0, 200), f.detail.slice(0, 1200), JSON.stringify(f.artifacts), f.resolution.slice(0, 800), now());
      }
    });
    saveArtifact(db, { projectId: p.id, kind: "consistency", data: { lastRunAt: now(), passed: rubric.passed, total: rubric.total }, userId: userId(c), provenance: { source: b.ai ? "ai" : "rules", model: b.ai ? ai.model : undefined, task: "consistency" } });
    logActivity(db, userId(c), p.id, "validated", `Ran consistency checks: ${rubric.passed}/${rubric.total} rules passed`);
    return c.json({ rubric, findings: listFindings(db, p.id) });
  });

  /* ── AI ────────────────────────────────────────────────────────── */

  app.post("/api/projects/:pid/ai/:task", async (c) => {
    const p = ownProject(c);
    const task = c.req.param("task") as AiTask;
    if (!AI_TASKS.includes(task) || task === "consistency") throw new HttpError(404, "Unknown AI task", "not_found");
    const body = await json(c, z.record(z.string(), z.unknown()));
    const result = await runTask({ db, ai, userId: userId(c), projectId: p.id, signal: c.req.raw.signal }, task, body);
    return c.json({ result });
  });

  /* ── Exports ───────────────────────────────────────────────────── */

  app.get("/api/projects/:pid/export", (c) => {
    const p = ownProject(c);
    const hasIdentity = !!activeDirection(loadBundle(db, p.id).identity);
    return c.json({
      files: Object.entries(EXPORT_FILES).map(([file, m]) => ({ file, label: m.label, format: m.format, available: !m.needsIdentity || hasIdentity, reason: m.needsIdentity && !hasIdentity ? "Needs a visual identity direction" : null })),
    });
  });

  app.get("/api/projects/:pid/export/:file", async (c) => {
    const p = ownProject(c);
    const file = c.req.param("file") as ExportFile;
    const meta = EXPORT_FILES[file];
    if (!meta) throw new HttpError(404, "Unknown export", "not_found");
    const bundle = loadBundle(db, p.id);
    if (meta.needsIdentity && !activeDirection(bundle.identity)) throw new HttpError(422, "Create a visual identity direction first.", "incomplete");
    const body: string | Buffer =
      file === "brand-guidelines.pdf" ? await guidelinesPdf(bundle)
      : file === "strategy.md" ? strategyMarkdown(bundle)
      : file === "tokens.json" ? tokensJson(bundle)
      : file === "variables.css" ? cssVariables(bundle)
      : logoFile(bundle, file === "logo-mark.svg" ? "mark" : file === "logo-reversed.svg" ? "reversed" : "primary");
    const slug = (bundle.naming?.chosen || p.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
    logActivity(db, userId(c), p.id, "exported", `Exported ${meta.label}`);
    return new Response(new Uint8Array(typeof body === "string" ? Buffer.from(body) : body), {
      headers: { "content-type": meta.type, "content-disposition": `attachment; filename="${slug}-${file}"`, "cache-control": "no-store" },
    });
  });

  app.all("/api/*", (c) => c.json({ error: "Not found", code: "not_found" }, 404));
  return app;
}
