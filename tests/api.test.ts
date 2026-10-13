import { describe, expect, it, beforeEach } from "vitest";
import { createApp } from "../server/app";
import { openDb } from "../server/db";
import type { AiProvider } from "../server/ai";
import { AiError } from "../server/ai";

/** Fake provider: returns canned output per task so no live API call is ever made. */
function fakeAi(outputs: Record<string, unknown> = {}): AiProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    configured: true,
    model: "test-model",
    calls,
    async generate({ task, schema }) {
      calls.push(task);
      if (!(task in outputs)) throw new AiError("invalid", "no fixture");
      return { data: schema.parse(outputs[task]), usage: { input: 10, output: 20 } };
    },
  };
}

function setup(ai: AiProvider = { configured: false, model: "x", generate: () => Promise.reject(new AiError("not_configured", "off")) }) {
  const db = openDb(":memory:");
  const app = createApp({ db, ai });
  // Minimal cookie jar per "browser".
  const client = () => {
    let cookie = "";
    const req = async (method: string, path: string, body?: unknown) => {
      const res = await app.request(path, { method, headers: { "content-type": "application/json", cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
      const set = res.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
      const type = res.headers.get("content-type") ?? "";
      return { status: res.status, body: type.includes("json") ? await res.json() : await res.text(), headers: res.headers };
    };
    return { req, get: (p: string) => req("GET", p), post: (p: string, b: unknown = {}) => req("POST", p, b), put: (p: string, b: unknown) => req("PUT", p, b), patch: (p: string, b: unknown) => req("PATCH", p, b), del: (p: string, b: unknown = {}) => req("DELETE", p, b) };
  };
  return { db, app, client };
}

const brief = { idea: "A refill-only stationery brand for design students in Pune.", industry: "Stationery", audience: "Design students", problem: "Supplies are wasteful and generic.", personality: ["Bold", "Warm"] };

describe("auth and ownership", () => {
  it("rejects project access without a session", async () => {
    const { client } = setup();
    expect((await client().get("/api/projects")).status).toBe(401);
  });

  it("hides another user's project behind 404", async () => {
    const { client } = setup();
    const a = client();
    const b = client();
    await a.post("/api/auth/register", { email: "a@x.io", password: "password1" });
    await b.post("/api/auth/register", { email: "b@x.io", password: "password1" });
    const { body } = await a.post("/api/projects", { name: "Alpha" });
    const pid = body.project.id;
    expect((await a.get(`/api/projects/${pid}`)).status).toBe(200);
    expect((await b.get(`/api/projects/${pid}`)).status).toBe(404);
    expect((await b.put(`/api/projects/${pid}/artifacts/brief`, { data: brief })).status).toBe(404);
    expect((await b.get(`/api/projects/${pid}/export/strategy.md`)).status).toBe(404);
  });

  it("requires JSON for mutations", async () => {
    const { app } = setup();
    const res = await app.request("/api/auth/guest", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "a=1" });
    expect(res.status).toBe(415);
  });

  it("keeps a guest's projects when they register", async () => {
    const { client } = setup();
    const c = client();
    await c.post("/api/auth/guest");
    const { body } = await c.post("/api/projects", { name: "Guest work", brief });
    const reg = await c.post("/api/auth/register", { email: "g@x.io", password: "password1" });
    expect(reg.status).toBe(200);
    const list = await c.get("/api/projects");
    expect(list.body.projects.map((p: { id: string }) => p.id)).toEqual([body.project.id]);
  });

  it("moves guest work into an existing account on login", async () => {
    const { client } = setup();
    const owner = client();
    await owner.post("/api/auth/register", { email: "o@x.io", password: "password1" });
    const visitor = client();
    await visitor.post("/api/auth/guest");
    await visitor.post("/api/projects", { name: "Draft" });
    expect((await visitor.post("/api/auth/login", { email: "o@x.io", password: "wrong-pass" })).status).toBe(401);
    expect((await visitor.post("/api/auth/login", { email: "o@x.io", password: "password1" })).status).toBe(200);
    expect((await owner.get("/api/projects")).body.projects).toHaveLength(1);
  });
});

describe("projects and artifacts", () => {
  let c: ReturnType<ReturnType<typeof setup>["client"]>;
  let pid: string;
  beforeEach(async () => {
    c = setup().client();
    await c.post("/api/auth/register", { email: "u@x.io", password: "password1" });
    pid = (await c.post("/api/projects", { name: "Nib" })).body.project.id;
  });

  it("creates, renames, lists and deletes projects", async () => {
    expect((await c.patch(`/api/projects/${pid}`, { name: "Nib & Co" })).body.project.name).toBe("Nib & Co");
    expect((await c.get("/api/projects?q=nib")).body.projects).toHaveLength(1);
    expect((await c.get("/api/projects?q=zzz")).body.projects).toHaveLength(0);
    expect((await c.del(`/api/projects/${pid}`)).status).toBe(200);
    expect((await c.get(`/api/projects/${pid}`)).status).toBe(404);
  });

  it("versions artifacts, folds rapid autosaves and blocks incomplete approval", async () => {
    const v1 = await c.put(`/api/projects/${pid}/artifacts/brief`, { data: { idea: "Too short" }, coalesce: true });
    expect(v1.body.artifact.version).toBe(1);
    const v1b = await c.put(`/api/projects/${pid}/artifacts/brief`, { data: { idea: "Still short" }, coalesce: true, baseRevision: v1.body.artifact.revision });
    expect(v1b.body.artifact.version).toBe(1); // folded into the same draft
    const v2 = await c.put(`/api/projects/${pid}/artifacts/brief`, { data: { idea: "Checkpoint" } });
    expect(v2.body.artifact.version).toBe(2);

    const blocked = await c.post(`/api/projects/${pid}/artifacts/brief/approve`);
    expect(blocked.status).toBe(422);
    expect(blocked.body.gaps).toContain("audience");

    await c.put(`/api/projects/${pid}/artifacts/brief`, { data: brief });
    const ok = await c.post(`/api/projects/${pid}/artifacts/brief/approve`);
    expect(ok.body.artifact.status).toBe("approved");
    // Editing an approved artifact creates a new draft version rather than mutating the approved one.
    const edit = await c.put(`/api/projects/${pid}/artifacts/brief`, { data: { ...brief, industry: "Paper goods" }, coalesce: true });
    expect(edit.body.artifact.version).toBe(4);
    expect(edit.body.artifact.status).toBe("draft");
    expect(edit.body.artifact.approvedVersion).toBe(3);

    const restored = await c.post(`/api/projects/${pid}/artifacts/brief/restore`, { version: 3 });
    expect(restored.body.artifact.data.industry).toBe("Stationery");
    expect(restored.body.artifact.versions[0].provenance.source).toBe("restore");
  });

  it("rejects stale writes with 409", async () => {
    const a = await c.put(`/api/projects/${pid}/artifacts/brief`, { data: brief });
    await c.put(`/api/projects/${pid}/artifacts/brief`, { data: { ...brief, market: "India" }, baseRevision: a.body.artifact.revision });
    const stale = await c.put(`/api/projects/${pid}/artifacts/brief`, { data: { ...brief, market: "Elsewhere" }, baseRevision: a.body.artifact.revision });
    expect(stale.status).toBe(409);
  });

  it("validates artifact content", async () => {
    const bad = await c.put(`/api/projects/${pid}/artifacts/identity`, { data: { directions: [{ id: "x", palette: { primary: "red" } }] } });
    expect(bad.status).toBe(422);
  });

  it("flags downstream artifacts when an upstream artifact changes, without rewriting them", async () => {
    await c.put(`/api/projects/${pid}/artifacts/brief`, { data: brief });
    const pos = { final: { id: "f", title: "T", statement: "For students, Nib is refill-first." } };
    await c.put(`/api/projects/${pid}/artifacts/positioning`, { data: pos });
    await c.post(`/api/projects/${pid}/artifacts/positioning/approve`);
    await c.put(`/api/projects/${pid}/artifacts/voice`, { data: { summary: "Warm and direct." } });
    await c.post(`/api/projects/${pid}/artifacts/voice/approve`);

    await c.put(`/api/projects/${pid}/artifacts/positioning`, { data: { final: { ...pos.final, statement: "Changed" } } });
    const voice = (await c.get(`/api/projects/${pid}/artifacts/voice`)).body.artifact;
    expect(voice.staleReason).toMatch(/Positioning changed/);
    expect(voice.data.summary).toBe("Warm and direct.");
    expect(voice.status).toBe("approved");
    const brief2 = (await c.get(`/api/projects/${pid}/artifacts/brief`)).body.artifact;
    expect(brief2.staleReason).toBeNull();

    const ack = await c.post(`/api/projects/${pid}/artifacts/voice/acknowledge`);
    expect(ack.body.artifact.staleReason).toBeNull();
  });

  it("runs the deterministic consistency rubric and stores findings", async () => {
    await c.put(`/api/projects/${pid}/artifacts/identity`, {
      data: { directions: [{ id: "d", name: "Low contrast", palette: { primary: "#EEEEEE", secondary: "#000000", accent: "#000000", ink: "#CCCCCC", paper: "#FFFFFF" }, typography: { display: "inter", text: "inter" } }], activeId: "d" },
    });
    const run = await c.post(`/api/projects/${pid}/consistency/run`, { ai: false });
    expect(run.status).toBe(200);
    const ids = run.body.findings.map((f: { ruleId: string }) => f.ruleId);
    expect(ids).toContain("text-contrast");
    expect(ids).toContain("primary-contrast");
    expect(run.body.rubric.total).toBeGreaterThan(0);
  });
});

describe("AI orchestration", () => {
  it("reports missing configuration instead of simulating output", async () => {
    const c = setup().client();
    await c.post("/api/auth/guest");
    const pid = (await c.post("/api/projects", { name: "P", brief })).body.project.id;
    const res = await c.post(`/api/projects/${pid}/ai/positioning`);
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("ai_not_configured");
  });

  it("stores validated output as a new version with provenance and usage", async () => {
    const direction = { title: "A", audience: "Students", statement: "For students…", problem: "p", valueProp: "v", differentiators: ["d"], promise: "pr", rationale: "r", tradeoffs: ["t"], risks: ["x"], messaging: ["m"] };
    const ai = fakeAi({ positioning: { directions: [direction, { ...direction, title: "B" }, { ...direction, title: "C" }] } });
    const { client, db } = setup(ai);
    const c = client();
    await c.post("/api/auth/guest");
    const pid = (await c.post("/api/projects", { name: "P", brief })).body.project.id;
    const res = await c.post(`/api/projects/${pid}/ai/positioning`);
    expect(res.status).toBe(200);
    const art = res.body.result;
    expect(art.data.directions.map((d: { title: string }) => d.title)).toEqual(["A", "B", "C"]);
    expect(art.versions[0].provenance).toMatchObject({ source: "ai", model: "test-model", upstream: { brief: { version: 1, approved: false } } });
    expect(db.get<{ n: number }>("SELECT COUNT(*) n FROM ai_usage WHERE status = 'ok'")!.n).toBe(1);
  });

  it("does not save anything when the model output is invalid", async () => {
    const ai = fakeAi({ identity: { directions: [{ name: "Bad", rationale: "", palette: { primary: "red", secondary: "#000000", accent: "#000000", ink: "#000000", paper: "#FFFFFF" }, typography: { display: "inter", text: "inter" }, mark: "circle", wordmark: { case: "upper", tracking: 0, weight: "600" }, motif: "none", imageDirection: "" }] } });
    const c = setup(ai).client();
    await c.post("/api/auth/guest");
    const pid = (await c.post("/api/projects", { name: "P" })).body.project.id;
    await c.put(`/api/projects/${pid}/artifacts/positioning`, { data: { final: { id: "f", statement: "s" } } });
    const res = await c.post(`/api/projects/${pid}/ai/identity`);
    expect(res.status).toBe(502);
    expect((await c.get(`/api/projects/${pid}/artifacts/identity`)).body.artifact.status).toBe("empty");
  });

  it("enforces the per-user rate limit", async () => {
    process.env.AI_RATE_LIMIT = "1";
    const ai = fakeAi({ briefAssist: {} });
    const c = setup(ai).client();
    await c.post("/api/auth/guest");
    const pid = (await c.post("/api/projects", { name: "P", brief })).body.project.id;
    await c.post(`/api/projects/${pid}/ai/brief-assist`); // fails validation but still counts
    expect((await c.post(`/api/projects/${pid}/ai/brief-assist`)).status).toBe(429);
    delete process.env.AI_RATE_LIMIT;
  });
});

describe("demo and exports", () => {
  it("seeds the demo project and generates every export", async () => {
    const c = setup().client();
    const demo = await c.post("/api/demo");
    expect(demo.status).toBe(201);
    const pid = demo.body.id;
    expect((await c.post("/api/demo")).body.id).toBe(pid); // idempotent per visitor

    const manifest = (await c.get(`/api/projects/${pid}/export`)).body.files;
    expect(manifest.every((f: { available: boolean }) => f.available)).toBe(true);

    const pdf = await c.get(`/api/projects/${pid}/export/brand-guidelines.pdf`);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(String(pdf.body).startsWith("%PDF")).toBe(true);

    const md = await c.get(`/api/projects/${pid}/export/strategy.md`);
    expect(md.body).toContain("# KORA — Brand strategy");
    expect(md.body).toContain("not** been checked");

    const tokens = (await c.get(`/api/projects/${pid}/export/tokens.json`)).body;
    expect(tokens.color.primary).toMatch(/^#[0-9A-F]{6}$/i);

    const css = await c.get(`/api/projects/${pid}/export/variables.css`);
    expect(css.body).toMatch(/--brand-primary: #[0-9A-F]{6};/i);

    for (const f of ["logo-primary.svg", "logo-mark.svg", "logo-reversed.svg"]) {
      const svg = await c.get(`/api/projects/${pid}/export/${f}`);
      expect(svg.headers.get("content-type")).toBe("image/svg+xml");
      expect(String(svg.body)).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"[\s\S]*<\/svg>$/);
    }
  });

  it("marks identity-dependent exports unavailable for a new project", async () => {
    const c = setup().client();
    await c.post("/api/auth/guest");
    const pid = (await c.post("/api/projects", { name: "Empty" })).body.project.id;
    const files = (await c.get(`/api/projects/${pid}/export`)).body.files;
    expect(files.find((f: { file: string }) => f.file === "tokens.json").available).toBe(false);
    expect((await c.get(`/api/projects/${pid}/export/tokens.json`)).status).toBe(422);
    expect((await c.get(`/api/projects/${pid}/export/brand-guidelines.pdf`)).status).toBe(200);
  });
});
