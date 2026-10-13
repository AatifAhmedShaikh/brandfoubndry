import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Play } from "lucide-react";
import { RULES, evaluate } from "@shared/consistency";
import type { Finding } from "@shared/schemas";
import { KIND_LABEL, KIND_PATH } from "@shared/workflow";
import { api, endpoints, type ApiError } from "@/lib/api";
import { timeAgo, useLoad } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { Segmented, Spinner, cx, useToast } from "@/components/ui";
import { useArtifact } from "./useArtifact";
import { useWorkspace } from "./context";
import { NextStage, PageLoading, SectionTitle, StageHeader } from "./parts";

export default function Consistency() {
  const { pid, project, refresh } = useWorkspace();
  const { ai } = useSession();
  const toast = useToast();
  const art = useArtifact("consistency");
  const bundle = useLoad(async () => {
    const [brief, positioning, voice, naming, identity] = await Promise.all((["brief", "positioning", "voice", "naming", "identity"] as const).map((k) => endpoints.artifact(pid, k)));
    const v = <T,>(a: { artifact: { status: string; data: T } }) => (a.artifact.status === "empty" ? null : a.artifact.data);
    return { brief: v(brief), positioning: v(positioning), voice: v(voice), naming: v(naming), identity: v(identity) } as Parameters<typeof evaluate>[0];
  }, [pid, project.updatedAt]);
  const findings = useLoad(() => endpoints.findings(pid), [pid]);
  const [withAi, setWithAi] = useState(false);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<"open" | "closed">("open");

  const rubric = useMemo(() => (bundle.data ? evaluate({ ...bundle.data, summaries: project.summaries }) : null), [bundle.data, project.summaries]);
  if (!art.draft || !rubric || !findings.data) return <PageLoading />;

  const run = async () => {
    setRunning(true);
    try {
      const r = await endpoints.runConsistency(pid, withAi && ai.configured);
      findings.setData({ findings: r.findings });
      art.reload();
      refresh();
      toast(`${r.rubric.passed} of ${r.rubric.total} applicable rules passed`, "success");
    } catch (e) {
      toast((e as ApiError).message, "error");
    } finally {
      setRunning(false);
    }
  };
  const setStatus = async (f: Finding, status: Finding["status"]) => {
    findings.setData({ findings: findings.data!.findings.map((x) => (x.id === f.id ? { ...x, status } : x)) });
    await api(`/projects/${pid}/findings/${f.id}`, { method: "PATCH", body: { status } }).catch((e) => (toast((e as ApiError).message, "error"), findings.reload()));
  };
  const list = findings.data.findings.filter((f) => (view === "open" ? f.status === "open" : f.status !== "open"));
  const last = art.draft.lastRunAt;

  return (
    <div>
      <StageHeader
        path="consistency"
        title={
          <>
            Does the system <span className="serif-em">agree with itself?</span>
          </>
        }
        intro="Deterministic rules check what can be measured, like contrast, banned vocabulary, slider conflicts and stale approvals. An optional AI review looks for semantic contradictions. No vague overall score: every rule is listed with its definition."
        extra={
          <div className="flex flex-wrap items-center gap-3">
            {ai.configured && (
              <label className="flex items-center gap-2 text-[13px] text-ink/70">
                <input type="checkbox" className="accent-ink" checked={withAi} onChange={(e) => setWithAi(e.target.checked)} /> Include AI review
              </label>
            )}
            <button className="btn btn-sm btn-ink" onClick={run} disabled={running}>
              {running ? <Spinner size={14} /> : <Play size={13} />} Run checks
            </button>
          </div>
        }
      />

      <div className="grid gap-12 px-4 py-10 sm:px-8 lg:grid-cols-12 lg:px-12">
        <section className="lg:col-span-5" aria-labelledby="rubric">
          <SectionTitle n="A" aside={<span className="font-mono text-[12px]">{rubric.total ? `${rubric.passed}/${rubric.total} pass` : "nothing to check yet"}</span>}>
            <span id="rubric">Rubric · live</span>
          </SectionTitle>
          <ol className="divide-y divide-ink/10">
            {RULES.map((r) => {
              const res = rubric.results.filter((x) => x.ruleId === r.id);
              const status = res.some((x) => x.status === "fail") ? "fail" : res[0]?.status;
              return (
                <li key={r.id} className="flex items-start gap-3 py-3">
                  <span className={cx("mt-1 grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px]", status === "pass" ? "bg-ink text-volt" : status === "fail" ? "bg-signal text-ink" : "ring-1 ring-ink/20 text-ink/40")}>{status === "pass" ? "✓" : status === "fail" ? "!" : "–"}</span>
                  <div className="min-w-0">
                    <p className={cx("text-[14px] leading-snug", status === "n/a" && "text-ink/45")}>{r.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink/45 uppercase">
                      {r.severity} · {status === "n/a" ? "not applicable yet" : r.artifacts.map((a) => KIND_LABEL[a]).join(" × ") || "workflow"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-[12px] leading-relaxed text-ink/55">The rubric re-evaluates as you edit. Run checks to record findings{last ? `; last run ${timeAgo(last)}` : ""}.</p>
        </section>

        <section className="lg:col-span-7" aria-labelledby="findings">
          <SectionTitle
            n="B"
            aside={
              <Segmented
                size="sm"
                label="Finding status"
                value={view}
                onChange={setView}
                options={[
                  { value: "open", label: `Open · ${findings.data.findings.filter((f) => f.status === "open").length}` },
                  { value: "closed", label: "Resolved / dismissed" },
                ]}
              />
            }
          >
            <span id="findings">Findings</span>
          </SectionTitle>
          {list.length === 0 ? (
            <div className="border border-dashed border-ink/25 px-6 py-14 text-center">
              <p className="font-display text-2xl font-semibold tracking-tight">{view === "open" ? (last ? "No open conflicts." : "Not run yet.") : "Nothing closed yet."}</p>
              <p className="mx-auto mt-2 max-w-sm text-[14px] text-ink/60">{view === "open" ? (last ? "The last run found nothing unresolved." : "Run the checks to record findings you can resolve or dismiss.") : "Resolved and dismissed findings collect here."}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((f) => (
                <li key={f.id} className="bg-sheet p-5 ring-1 ring-ink/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cx("inline-block size-2 rotate-45", f.severity === "high" ? "bg-signal" : f.severity === "medium" ? "bg-amber" : "bg-stone")} />
                    <span className="text-[12px] font-semibold capitalize">{f.severity}</span>
                    <span className={cx("chip !py-0.5", f.source === "ai" ? "border-dashed text-ink/60" : "text-ink/60")}>{f.source === "ai" ? "AI review · judgment" : "Rule · measured"}</span>
                  </div>
                  <h3 className="mt-3 text-[18px] leading-snug font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink/70">{f.detail}</p>
                  {f.artifacts.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="text-[12px] text-ink/50">Conflicting:</span>
                      {f.artifacts.map((a, i) => (
                        <span key={a} className="flex items-center gap-2">
                          {i > 0 && <span className="text-ink/30">×</span>}
                          <Link to={`/projects/${pid}/${KIND_PATH[a]}`} className="inline-flex items-center gap-1 rounded-[2px] bg-ink/[0.06] px-2 py-1 text-[12px] font-medium hover:bg-ink hover:text-paper">
                            {KIND_LABEL[a]} <ArrowUpRight size={11} />
                          </Link>
                        </span>
                      ))}
                    </div>
                  )}
                  {f.resolution && <p className="mt-4 border-t border-ink/10 pt-3 text-[14px] font-medium">→ {f.resolution}</p>}
                  <div className="mt-4 flex gap-2">
                    {f.status === "open" ? (
                      <>
                        <button className="btn btn-sm btn-ink" onClick={() => setStatus(f, "resolved")}>
                          Mark resolved
                        </button>
                        <button className="btn btn-sm btn-quiet text-ink/60" onClick={() => setStatus(f, "dismissed")}>
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-sm btn-line" onClick={() => setStatus(f, "open")}>
                        Reopen · {f.status}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <NextStage path="consistency" />
    </div>
  );
}
