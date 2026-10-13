import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Menu, Settings as SettingsIcon, X } from "lucide-react";
import { endpoints, type ApiError, type Project } from "@/lib/api";
import { useSession } from "@/lib/session";
import { FoundryMark } from "@/components/Brand";
import { GuestBanner, RequireSession } from "@/components/AppFrame";
import { BrandTile, WorkflowMeter } from "@/components/Workflow";
import { Spinner, StatusGlyph, cx } from "@/components/ui";
import { NotFound } from "@/pages/Errors";
import { PAGES, STAGES } from "@shared/workflow";
import { WorkspaceContext } from "./context";

export default function Shell() {
  return (
    <RequireSession>
      <ShellBody />
    </RequireSession>
  );
}

function ShellBody() {
  const { id = "" } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  const refresh = useCallback(() => {
    endpoints
      .project(id)
      .then((r) => (setProject(r.project), setError(null)))
      .catch((e: ApiError) => setError(e));
  }, [id]);
  useEffect(refresh, [refresh]);
  useEffect(() => {
    setOpen(false);
    mainRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  if (error?.status === 404) return <NotFound />;
  if (error && !project)
    return (
      <div className="grid min-h-dvh place-items-center bg-paper p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Couldn't open this project.</p>
          <p className="mt-2 text-ink/60">{error.message}</p>
          <button className="btn btn-ink mt-6" onClick={refresh}>
            Retry
          </button>
        </div>
      </div>
    );
  if (!project)
    return (
      <div className="grid min-h-dvh place-items-center bg-ink text-paper/40">
        <Spinner size={20} />
      </div>
    );

  const current = PAGES.find((p) => loc.pathname.endsWith(`/${p.path}`));

  return (
    <WorkspaceContext.Provider value={{ pid: id, project, refresh }}>
      <div className="min-h-dvh bg-paper text-ink lg:grid lg:grid-cols-[272px_1fr]">
        {/* Desktop rail */}
        <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto bg-ink text-paper lg:flex">
          <Rail project={project} />
        </aside>

        {/* Mobile bar + drawer */}
        <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-paper/10 bg-ink px-4 text-paper lg:hidden">
          <button className="btn btn-quiet -ml-2" onClick={() => setOpen(true)} aria-label="Open workflow navigation" aria-expanded={open}>
            <Menu size={20} />
          </button>
          <BrandTile name={project.brand.name} direction={project.brand.direction} size={28} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14px] font-semibold">{project.brand.name}</p>
            <p className="truncate font-mono text-[10px] text-paper/50 uppercase">{current ? `${current.stage.n} · ${current.label}` : "Overview"}</p>
          </div>
        </div>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Workflow navigation">
            <button className="fade-in absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} aria-label="Close navigation" />
            <aside className="rise absolute inset-y-0 left-0 flex w-[86%] max-w-[320px] flex-col overflow-y-auto bg-ink text-paper" style={{ animationDuration: ".35s" }}>
              <button className="btn btn-quiet absolute top-3 right-2 text-paper/60" onClick={() => setOpen(false)} aria-label="Close navigation">
                <X size={18} />
              </button>
              <Rail project={project} />
            </aside>
          </div>
        )}

        <main ref={mainRef} id="workspace-main" className="min-w-0">
          <GuestBanner />
          <Outlet />
        </main>
      </div>
    </WorkspaceContext.Provider>
  );
}

function Rail({ project }: { project: Project }) {
  const { ai } = useSession();
  const by = new Map(project.summaries.map((s) => [s.kind, s]));
  const link = (path: string, label: string, artifact: (typeof PAGES)[number]["artifact"], sub = false) => {
    const s = artifact ? by.get(artifact) : undefined;
    return (
      <NavLink
        key={path}
        to={`/projects/${project.id}/${path}`}
        className={({ isActive }) =>
          cx(
            "group relative flex items-center gap-3 rounded-[3px] py-2 pr-3 text-[14px] transition",
            sub ? "pl-11" : "pl-3",
            isActive ? "bg-paper/[0.07] text-paper" : "text-paper/60 hover:bg-paper/[0.04] hover:text-paper",
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && <span className="absolute inset-y-1.5 left-0 w-[2px] bg-volt" />}
            <span className="flex-1 truncate">{label}</span>
            {artifact ? <StatusGlyph status={s?.status ?? "empty"} stale={!!s?.staleReason} /> : null}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="px-5 pt-5">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-[12px] text-paper/50 transition hover:text-paper">
          <ArrowLeft size={13} /> All projects
        </Link>
      </div>
      <Link to={`/projects/${project.id}`} className="mx-3 mt-5 flex items-center gap-3 rounded-[3px] p-2 transition hover:bg-paper/[0.05]">
        <BrandTile name={project.brand.name} direction={project.brand.direction} size={44} />
        <div className="min-w-0">
          <p className="truncate font-display text-[18px] leading-tight font-semibold tracking-tight">{project.brand.name}</p>
          <p className="mt-0.5 font-mono text-[10px] text-paper/45 uppercase">
            {project.isDemo ? "Demo · " : ""}
            {project.progress.approved}/{project.progress.total} approved
          </p>
        </div>
      </Link>
      <WorkflowMeter dark summaries={project.summaries} className="mx-5 mt-4" />

      <nav className="mt-6 flex-1 px-2" aria-label="Workflow stages">
        <ol className="space-y-1">
          {STAGES.map((st) => (
            <li key={st.key}>
              {st.pages.length === 1 ? (
                <div className="flex items-center">
                  <span className="w-8 shrink-0 pl-3 font-mono text-[10px] text-paper/30">{st.n}</span>
                  <div className="flex-1">{link(st.pages[0].path, st.label, st.pages[0].artifact)}</div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center py-2">
                    <span className="w-8 shrink-0 pl-3 font-mono text-[10px] text-paper/30">{st.n}</span>
                    <span className="pl-3 text-[14px] text-paper/60">{st.label}</span>
                  </div>
                  {st.pages.map((p) => link(p.path, p.label, p.artifact, true))}
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-6 border-t border-paper/10 px-5 py-4">
        <div className="flex items-center justify-between gap-2 text-[12px] text-paper/50">
          <span className="flex min-w-0 items-center gap-2" title={ai.configured ? `AI generation uses ${ai.model}` : "No ANTHROPIC_API_KEY on the server. Manual editing works everywhere."}>
            <span className={cx("inline-block size-1.5 shrink-0 rounded-full", ai.configured ? "bg-volt" : "bg-paper/30")} />
            <span className="truncate font-mono">{ai.configured ? ai.model : "AI not configured"}</span>
          </span>
          <Link to="/settings" className="rounded-[3px] p-1.5 hover:bg-paper/10 hover:text-paper" aria-label="Settings">
            <SettingsIcon size={15} />
          </Link>
        </div>
        <Link to="/" className="mt-4 flex items-center gap-2 text-paper/30 transition hover:text-paper/70" aria-label="BrandFoundry home">
          <FoundryMark size={16} /> <span className="font-display text-[12px] font-semibold tracking-tight">BrandFoundry</span>
        </Link>
      </div>
    </div>
  );
}
