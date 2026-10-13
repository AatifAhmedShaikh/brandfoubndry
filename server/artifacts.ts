import { ARTIFACT_SCHEMAS, briefGaps, emptyArtifact, type ArtifactData, type ArtifactKind, type ArtifactRecord, type ArtifactSummary, type Brief, type Provenance } from "../shared/schemas";
import { DEPENDENCIES, KIND_LABEL, downstreamOf } from "../shared/workflow";
import { type DB, id, now } from "./db";

export class HttpError extends Error {
  constructor(public status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 502 | 503, message: string, public code = "error", public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

type ArtifactRow = { id: string; kind: ArtifactKind; current_version: number; approved_version: number | null; revision: number; stale_reason: string | null; updated_at: string };
type VersionRow = { id: string; version: number; data: string; provenance: string; created_by: string; created_at: string };

const COALESCE_MS = 15 * 60_000;

export function logActivity(db: DB, userId: string, projectId: string | null, type: string, message: string) {
  db.run("INSERT INTO activity_events VALUES (?, ?, ?, ?, ?, ?)", id(), userId, projectId, type, message.slice(0, 300), now());
}

const row = (db: DB, projectId: string, kind: ArtifactKind) =>
  db.get<ArtifactRow>("SELECT id, kind, current_version, approved_version, revision, stale_reason, updated_at FROM artifacts WHERE project_id = ? AND kind = ?", projectId, kind);

const toSummary = (r: ArtifactRow): ArtifactSummary => ({
  kind: r.kind,
  status: r.approved_version === r.current_version ? "approved" : "draft",
  version: r.current_version,
  approvedVersion: r.approved_version,
  staleReason: r.stale_reason,
  updatedAt: r.updated_at,
});

export function summaries(db: DB, projectId: string): ArtifactSummary[] {
  return db.all<ArtifactRow>("SELECT id, kind, current_version, approved_version, revision, stale_reason, updated_at FROM artifacts WHERE project_id = ?", projectId).map(toSummary);
}

/** Parses stored JSON through the current schema so older rows gain new defaults. */
const parse = <K extends ArtifactKind>(kind: K, json: string) => ARTIFACT_SCHEMAS[kind].parse(JSON.parse(json)) as ArtifactData[K];

export function getArtifact<K extends ArtifactKind>(db: DB, projectId: string, kind: K): ArtifactRecord<K> {
  const r = row(db, projectId, kind);
  if (!r) return { kind, status: "empty", version: 0, approvedVersion: null, staleReason: null, updatedAt: null, revision: 0, data: emptyArtifact(kind), versions: [] };
  const versions = db.all<VersionRow>("SELECT id, version, data, provenance, created_by, created_at FROM artifact_versions WHERE artifact_id = ? ORDER BY version DESC", r.id);
  const current = versions.find((v) => v.version === r.current_version)!;
  return {
    ...toSummary(r),
    revision: r.revision,
    data: parse(kind, current.data),
    versions: versions.map((v) => ({ version: v.version, createdAt: v.created_at, provenance: JSON.parse(v.provenance) as Provenance })),
  };
}

export function getVersion<K extends ArtifactKind>(db: DB, projectId: string, kind: K, version: number) {
  const r = row(db, projectId, kind);
  const v = r && db.get<VersionRow>("SELECT data, provenance, created_at FROM artifact_versions WHERE artifact_id = ? AND version = ?", r.id, version);
  if (!v) throw new HttpError(404, "Version not found", "not_found");
  return { version, data: parse(kind, v.data), provenance: JSON.parse(v.provenance) as Provenance, createdAt: v.created_at };
}

/**
 * Inputs a stage should be built from: the approved version where one exists, otherwise the
 * current draft. Returned with the version numbers so provenance can record them.
 */
export function upstreamInputs(db: DB, projectId: string, kind: ArtifactKind) {
  const inputs: Partial<{ [K in ArtifactKind]: ArtifactData[K] }> = {};
  const upstream: NonNullable<Provenance["upstream"]> = {};
  for (const dep of DEPENDENCIES[kind]) {
    const r = row(db, projectId, dep);
    if (!r) continue;
    const version = r.approved_version ?? r.current_version;
    const v = db.get<VersionRow>("SELECT data FROM artifact_versions WHERE artifact_id = ? AND version = ?", r.id, version)!;
    (inputs as Record<string, unknown>)[dep] = parse(dep, v.data);
    upstream[dep] = { version, approved: r.approved_version != null };
  }
  return { inputs, upstream };
}

type SaveArgs<K extends ArtifactKind> = {
  projectId: string;
  kind: K;
  data: unknown;
  userId: string;
  provenance: Provenance;
  baseRevision?: number;
  /** Fold rapid manual edits into the current draft version instead of creating a new one. */
  coalesce?: boolean;
};

/**
 * Saves artifact content as a new version (or folds it into the current manual draft), then
 * flags every existing downstream artifact as needing review. Nothing downstream is rewritten.
 */
export function saveArtifact<K extends ArtifactKind>(db: DB, a: SaveArgs<K>): ArtifactRecord<K> {
  const parsed = ARTIFACT_SCHEMAS[a.kind].safeParse(a.data);
  if (!parsed.success) throw new HttpError(422, "Artifact content is invalid", "invalid", { issues: parsed.error.issues.slice(0, 10) });
  const data = JSON.stringify(parsed.data);
  if (data.length > 400_000) throw new HttpError(413, "Artifact is too large", "too_large");

  db.tx(() => {
    const r = row(db, a.projectId, a.kind);
    if (r && a.baseRevision !== undefined && a.baseRevision !== r.revision)
      throw new HttpError(409, "This artifact changed in another tab or session. Reload to see the latest version.", "conflict");
    const t = now();
    const { upstream } = upstreamInputs(db, a.projectId, a.kind);
    const provenance = JSON.stringify({ ...a.provenance, upstream: a.provenance.upstream ?? upstream });
    let versionId: string;
    let version: number;

    if (!r) {
      const artifactId = id();
      version = 1;
      db.run("INSERT INTO artifacts VALUES (?, ?, ?, 1, NULL, 1, NULL, ?)", artifactId, a.projectId, a.kind, t);
      versionId = id();
      db.run("INSERT INTO artifact_versions VALUES (?, ?, 1, ?, ?, ?, ?, ?)", versionId, artifactId, data, provenance, a.userId, t, t);
    } else {
      const cur = db.get<VersionRow>("SELECT id, version, data, provenance, created_by, created_at FROM artifact_versions WHERE artifact_id = ? AND version = ?", r.id, r.current_version)!;
      if (cur.data === data) return; // no-op save
      const curSource = (JSON.parse(cur.provenance) as Provenance).source;
      const canFold = a.coalesce && a.provenance.source === "manual" && curSource === "manual" && cur.created_by === a.userId && r.approved_version !== r.current_version && Date.now() - Date.parse(cur.created_at) < COALESCE_MS;
      if (canFold) {
        versionId = cur.id;
        version = cur.version;
        db.run("UPDATE artifact_versions SET data = ?, provenance = ?, updated_at = ? WHERE id = ?", data, provenance, t, cur.id);
      } else {
        version = r.current_version + 1;
        versionId = id();
        db.run("INSERT INTO artifact_versions VALUES (?, ?, ?, ?, ?, ?, ?, ?)", versionId, r.id, version, data, provenance, a.userId, t, t);
      }
      // Regeneration from current inputs resolves "needs review"; a manual edit does not.
      const clears = a.provenance.source === "ai" || a.provenance.source === "rules";
      db.run(
        `UPDATE artifacts SET current_version = ?, revision = revision + 1, updated_at = ?${clears ? ", stale_reason = NULL" : ""} WHERE id = ?`,
        version,
        t,
        r.id,
      );
    }

    db.run("DELETE FROM artifact_dependencies WHERE version_id = ?", versionId);
    for (const [k, v] of Object.entries(JSON.parse(provenance).upstream ?? {}) as [string, { version: number }][])
      db.run("INSERT INTO artifact_dependencies VALUES (?, ?, ?)", versionId, k, v.version);

    const reason = `${KIND_LABEL[a.kind]} changed (v${version})`;
    for (const down of downstreamOf(a.kind)) db.run("UPDATE artifacts SET stale_reason = ? WHERE project_id = ? AND kind = ?", reason, a.projectId, down);
    db.run("UPDATE projects SET updated_at = ? WHERE id = ?", t, a.projectId);
  });
  return getArtifact(db, a.projectId, a.kind);
}

export function approveArtifact(db: DB, projectId: string, kind: ArtifactKind, userId: string) {
  const a = getArtifact(db, projectId, kind);
  if (a.status === "empty") throw new HttpError(422, "Nothing to approve yet", "empty");
  if (kind === "brief") {
    const gaps = briefGaps(a.data as Brief);
    if (gaps.length) throw new HttpError(422, `Complete the brief before approving: ${gaps.join(", ")}`, "incomplete", { gaps });
  }
  db.run("UPDATE artifacts SET approved_version = current_version, stale_reason = NULL, revision = revision + 1, updated_at = ? WHERE project_id = ? AND kind = ?", now(), projectId, kind);
  logActivity(db, userId, projectId, "approved", `Approved ${KIND_LABEL[kind]} v${a.version}`);
  return getArtifact(db, projectId, kind);
}

export function unapproveArtifact(db: DB, projectId: string, kind: ArtifactKind, userId: string) {
  db.run("UPDATE artifacts SET approved_version = NULL, revision = revision + 1, updated_at = ? WHERE project_id = ? AND kind = ?", now(), projectId, kind);
  logActivity(db, userId, projectId, "reopened", `Returned ${KIND_LABEL[kind]} to draft`);
  return getArtifact(db, projectId, kind);
}

export function acknowledgeArtifact(db: DB, projectId: string, kind: ArtifactKind, userId: string) {
  db.run("UPDATE artifacts SET stale_reason = NULL, revision = revision + 1 WHERE project_id = ? AND kind = ?", projectId, kind);
  logActivity(db, userId, projectId, "reviewed", `Confirmed ${KIND_LABEL[kind]} is still valid`);
  return getArtifact(db, projectId, kind);
}
