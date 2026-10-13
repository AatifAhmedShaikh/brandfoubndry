import type { ArtifactKind, Finding } from "../shared/schemas";
import { getArtifact, summaries } from "./artifacts";
import type { DB } from "./db";
import type { KitBundle } from "./export";

type FindingRow = { id: string; source: "rule" | "ai"; rule_id: string | null; severity: Finding["severity"]; title: string; detail: string; artifacts: string; resolution: string; status: Finding["status"]; created_at: string };

export const toFinding = (r: FindingRow): Finding => ({ id: r.id, source: r.source, ruleId: r.rule_id, severity: r.severity, title: r.title, detail: r.detail, artifacts: JSON.parse(r.artifacts) as ArtifactKind[], resolution: r.resolution, status: r.status, createdAt: r.created_at });

export const listFindings = (db: DB, projectId: string) =>
  db.all<FindingRow>("SELECT * FROM validation_findings WHERE project_id = ? ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC", projectId).map(toFinding);

/** Current content of every artifact in a project, for exports and cross-artifact checks. */
export function loadBundle(db: DB, projectId: string): KitBundle {
  const project = db.get<{ name: string }>("SELECT name FROM projects WHERE id = ?", projectId)!;
  const get = <K extends ArtifactKind>(k: K) => {
    const a = getArtifact(db, projectId, k);
    return a.status === "empty" ? null : a.data;
  };
  return {
    projectName: project.name,
    brief: get("brief"),
    research: get("research"),
    positioning: get("positioning"),
    voice: get("voice"),
    naming: get("naming"),
    identity: get("identity"),
    challenge: get("challenge"),
    findings: listFindings(db, projectId),
    summaries: summaries(db, projectId),
  };
}
