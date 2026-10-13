import type { ArtifactKind, ArtifactRecord, ArtifactSummary, Competitor, Finding, IdentityDirection, NamingCandidate, ResearchSource } from "@shared/schemas";
import type { RuleResult } from "@shared/consistency";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code: string, public body: Record<string, unknown> = {}) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: { "content-type": "application/json" },
      body: init.body === undefined ? (init.method && init.method !== "GET" ? "{}" : undefined) : JSON.stringify(init.body),
      credentials: "same-origin",
      signal: init.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "Can't reach BrandFoundry. Check your connection and try again.", "network");
  }
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : {};
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`, data.code ?? "error", data);
  return data as T;
}

export type User = { id: string; email: string | null; displayName: string; isGuest: boolean };
export type Project = {
  id: string;
  name: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  summaries: ArtifactSummary[];
  progress: { approved: number; total: number; stale: number; next?: { path: string; label: string } };
  brand: { name: string; direction: IdentityDirection | null };
};
export type Activity = { id: string; type: string; message: string; createdAt: string; projectId?: string | null; projectName?: string | null };
export type ExportEntry = { file: string; label: string; format: string; available: boolean; reason: string | null };

const P = (pid: string) => `/projects/${pid}`;

export const endpoints = {
  session: () => api<{ user: User | null; ai: { configured: boolean; model: string } }>("/session"),
  guest: () => api<{ user: User }>("/auth/guest", { method: "POST" }),
  login: (email: string, password: string) => api<{ user: User }>("/auth/login", { body: { email, password } }),
  register: (email: string, password: string, displayName: string) => api<{ user: User }>("/auth/register", { body: { email, password, displayName } }),
  logout: () => api("/auth/logout", { method: "POST" }),
  projects: (q = "") => api<{ projects: Project[] }>(`/projects${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  project: (pid: string) => api<{ project: Project }>(P(pid)),
  createProject: (name: string, brief?: Record<string, unknown>) => api<{ project: Project }>("/projects", { body: { name, brief } }),
  demo: () => api<{ id: string }>("/demo", { method: "POST" }),
  activity: (limit = 12) => api<{ activity: Activity[] }>(`/activity?limit=${limit}`),
  projectActivity: (pid: string) => api<{ activity: Activity[] }>(`${P(pid)}/activity`),
  artifact: <K extends ArtifactKind>(pid: string, kind: K) => api<{ artifact: ArtifactRecord<K> }>(`${P(pid)}/artifacts/${kind}`),
  competitors: (pid: string) => api<{ competitors: Competitor[]; sources: ResearchSource[] }>(`${P(pid)}/competitors`),
  names: (pid: string) => api<{ names: NamingCandidate[] }>(`${P(pid)}/names`),
  findings: (pid: string) => api<{ findings: Finding[] }>(`${P(pid)}/findings`),
  runConsistency: (pid: string, ai: boolean) => api<{ rubric: { results: RuleResult[]; passed: number; total: number }; findings: Finding[] }>(`${P(pid)}/consistency/run`, { body: { ai } }),
  exports: (pid: string) => api<{ files: ExportEntry[] }>(`${P(pid)}/export`),
};
