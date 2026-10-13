import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { api, endpoints, type ApiError } from "@/lib/api";
import { useLoad, timeAgo } from "@/lib/hooks";
import { ConfirmDialog, Dialog, StatusGlyph, cx, useToast } from "@/components/ui";
import { Logo, PaletteStrip } from "@/components/identity";
import { STAGES, KIND_LABEL } from "@shared/workflow";
import { casedName, fontStack } from "@shared/identity";
import { useWorkspace } from "./context";

export default function Overview() {
  const { pid, project, refresh } = useWorkspace();
  const activity = useLoad(() => endpoints.projectActivity(pid), [pid, project.updatedAt]);
  const toast = useToast();
  const nav = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const [deleting, setDeleting] = useState(false);
  const by = new Map(project.summaries.map((s) => [s.kind, s]));
  const d = project.brand.direction;
  const next = project.progress.next;
  useEffect(() => {
    document.title = `${project.brand.name} — BrandFoundry`;
  }, [project.brand.name]);

  return (
    <div>
      {/* Cover: the brand as it currently stands */}
      <section className="relative overflow-hidden" style={d ? { background: d.palette.paper, color: d.palette.ink } : undefined}>
        <div className="grid gap-10 px-4 pt-10 pb-10 sm:px-8 lg:grid-cols-12 lg:px-12 lg:pt-14">
          <div className="lg:col-span-7">
            <p className="eyebrow rise opacity-60">{project.isDemo ? "Demo project · fictional brand" : "Brand project"} · created {timeAgo(project.createdAt)}</p>
            <h1 className="rise mt-4 text-[length:var(--text-giant)] leading-[0.9] font-bold tracking-[-0.045em] break-words" style={{ ["--i" as string]: 1, fontFamily: d ? fontStack(d.typography.display) : undefined }}>
              {d ? casedName(project.brand.name, d.wordmark.case) : project.brand.name}
            </h1>
            {project.brand.name !== project.name && <p className="mt-3 font-mono text-[12px] opacity-55">Project: {project.name}</p>}
            <div className="rise mt-8 flex flex-wrap gap-2" style={{ ["--i" as string]: 2 }}>
              {next ? (
                <Link to={next.path} className="btn btn-ink">
                  Continue: {next.label} <ArrowRight size={15} />
                </Link>
              ) : (
                <Link to="brand-kit" className="btn btn-ink">
                  Export brand kit <ArrowRight size={15} />
                </Link>
              )}
              <button className="btn btn-line" onClick={() => (setName(project.name), setRenaming(true))}>
                <Pencil size={14} /> Rename
              </button>
              <button className="btn btn-quiet text-current/70" onClick={() => setDeleting(true)} aria-label="Delete project">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <div className="lg:col-span-5">
            {d ? (
              <div className="cropmarks">
                <div className="grid grid-rows-[1fr_auto] overflow-hidden rounded-[3px] ring-1 ring-current/15">
                  <div className="grid h-48 place-items-center p-8" style={{ background: d.palette.ink }}>
                    <Logo d={d} name={project.brand.name} variant="reversed" className="w-full max-w-xs [&>svg]:max-h-28" />
                  </div>
                  <PaletteStrip d={d} labels={false} className="h-10" />
                </div>
              </div>
            ) : (
              <div className="grid h-56 place-items-center rounded-[3px] border border-dashed border-current/25 p-8 text-center text-[14px] opacity-60">The visual identity appears here once you build it in the identity studio.</div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-12 border-t border-ink/15 px-4 py-10 sm:px-8 lg:grid-cols-12 lg:px-12">
        <section className="lg:col-span-8" aria-labelledby="ledger">
          <h2 id="ledger" className="eyebrow mb-4 text-stone-dark">
            Workflow ledger
          </h2>
          <ol className="border-t border-ink/15">
            {STAGES.flatMap((st) =>
              st.pages.map((pg) => {
                const s = pg.artifact ? by.get(pg.artifact) : undefined;
                return (
                  <li key={pg.path} className="border-b border-ink/10">
                    <Link to={pg.path} className="group grid grid-cols-[36px_1fr_auto] items-center gap-4 py-4 sm:grid-cols-[36px_160px_1fr_auto]">
                      <span className="font-mono text-[11px] text-stone-dark">{st.n}</span>
                      <span className="font-display text-[18px] font-semibold tracking-tight">{pg.label}</span>
                      <span className="col-start-2 -mt-3 flex items-center gap-2 text-[13px] text-ink/60 sm:col-start-auto sm:mt-0">
                        {pg.artifact ? (
                          <>
                            <StatusGlyph status={s?.status ?? "empty"} stale={!!s?.staleReason} />
                            {s?.staleReason ? <span className="text-signal">Needs review · {s.staleReason}</span> : s?.status === "approved" ? `Approved v${s.approvedVersion}` : s?.status === "draft" ? `Draft v${s.version}${s.approvedVersion ? ` · approved v${s.approvedVersion}` : ""}` : "Not started"}
                            {s?.updatedAt && <span className="hidden text-ink/40 md:inline">· {timeAgo(s.updatedAt)}</span>}
                          </>
                        ) : (
                          pg.blurb
                        )}
                      </span>
                      <ArrowRight size={16} className="row-start-1 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-ink sm:row-start-auto" style={{ gridColumn: "-2 / -1" }} />
                    </Link>
                  </li>
                );
              }),
            )}
          </ol>
        </section>

        <aside className="lg:col-span-4" aria-labelledby="proj-activity">
          <h2 id="proj-activity" className="eyebrow mb-4 text-stone-dark">
            Project activity
          </h2>
          {activity.data?.activity.length ? (
            <ol className="space-y-4 border-l border-ink/15 pl-5">
              {activity.data.activity.slice(0, 12).map((a) => (
                <li key={a.id} className="relative">
                  <span className={cx("absolute top-1.5 -left-[24px] size-[7px] rotate-45", a.type === "approved" ? "bg-ink" : a.type === "generated" ? "bg-volt ring-1 ring-ink/40" : "bg-paper-3")} />
                  <p className="text-[14px] leading-snug">{a.message}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink/45">{timeAgo(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[14px] text-ink/50">No activity yet.</p>
          )}
          {project.progress.stale > 0 && <p className="mt-8 border-l-2 border-signal pl-3 text-[13px] text-ink/70">{project.summaries.filter((s) => s.staleReason).map((s) => KIND_LABEL[s.kind]).join(", ")} need review after upstream changes.</p>}
        </aside>
      </div>

      <Dialog open={renaming} onClose={() => setRenaming(false)} title="Rename project">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api(`/projects/${pid}`, { method: "PATCH", body: { name } });
              refresh();
              setRenaming(false);
              toast("Project renamed", "success");
            } catch (err) {
              toast((err as ApiError).message, "error");
            }
          }}
        >
          <label className="field-label" htmlFor="pname">
            Project name
          </label>
          <input id="pname" className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
          <p className="field-hint">The brand name shown across the workspace comes from Naming once you choose one.</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn btn-line" onClick={() => setRenaming(false)}>
              Cancel
            </button>
            <button className="btn btn-ink" disabled={!name.trim()}>
              Save
            </button>
          </div>
        </form>
      </Dialog>
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        danger
        title={`Delete ${project.name}?`}
        confirmLabel="Delete project"
        body="Every artifact, version, competitor, name candidate and finding in this project will be permanently deleted."
        onConfirm={async () => {
          try {
            await api(`/projects/${pid}`, { method: "DELETE" });
            toast("Project deleted", "success");
            nav("/dashboard");
          } catch (err) {
            toast((err as ApiError).message, "error");
          }
        }}
      />
    </div>
  );
}
