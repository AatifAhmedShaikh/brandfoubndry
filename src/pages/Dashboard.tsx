import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Plus, Search } from "lucide-react";
import { endpoints, type Project } from "@/lib/api";
import { useLoad, timeAgo } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { AppFrame } from "@/components/AppFrame";
import { BrandTile, WorkflowMeter } from "@/components/Workflow";
import { Notice, Segmented, Spinner, cx } from "@/components/ui";
import { KIND_LABEL, KIND_PATH } from "@shared/workflow";

type Filter = "all" | "review" | "progress" | "complete";

const reviewItems = (p: Project) => p.summaries.filter((s) => s.staleReason);
const isComplete = (p: Project) => p.progress.approved === p.progress.total && p.progress.stale === 0;

export default function Dashboard() {
  return (
    <AppFrame>
      <DashboardBody />
    </AppFrame>
  );
}

function DashboardBody() {
  const { user } = useSession();
  const projects = useLoad(() => endpoints.projects(), []);
  const activity = useLoad(() => endpoints.activity(14), []);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => {
    document.title = "Projects — BrandFoundry";
  }, []);

  const all = useMemo(() => projects.data?.projects ?? [], [projects.data]);
  const shown = useMemo(
    () =>
      all.filter((p) => {
        if (q && !`${p.name} ${p.brand.name}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (filter === "review") return reviewItems(p).length > 0;
        if (filter === "complete") return isComplete(p);
        if (filter === "progress") return !isComplete(p);
        return true;
      }),
    [all, q, filter],
  );
  const awaiting = all.flatMap((p) => reviewItems(p).map((s) => ({ p, s })));
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="mx-auto max-w-[1440px] px-4 pt-10 pb-20 sm:px-8 sm:pt-14">
      <section className="grid gap-8 border-b border-ink/15 pb-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="eyebrow rise text-stone-dark">{today}</p>
          <h1 className="rise mt-4 text-[length:var(--text-huge)] leading-[0.95] font-semibold tracking-[-0.045em]" style={{ ["--i" as string]: 1 }}>
            {user?.displayName ? `${user.displayName.split(" ")[0]}'s foundry.` : "Your foundry."}{" "}
            <span className="serif-em text-ink/55">
              {projects.loading ? "" : all.length === 0 ? "Nothing cast yet." : `${all.length} ${all.length === 1 ? "brand" : "brands"} on the bench.`}
            </span>
          </h1>
        </div>
        <Link to="/projects/new" className="group rise flex items-center justify-between gap-6 rounded-[3px] bg-ink p-5 text-paper transition hover:bg-graphite lg:col-span-4" style={{ ["--i" as string]: 2 }}>
          <span>
            <span className="block font-display text-xl font-semibold tracking-tight">Create a brand</span>
            <span className="mt-1 block text-[13px] text-paper/55">Start from a sentence. Refine from there.</span>
          </span>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-volt text-ink transition group-hover:rotate-90">
            <Plus size={20} />
          </span>
        </Link>
      </section>

      {projects.error && (
        <div className="mt-8">
          <Notice tone="danger" title="Couldn't load your projects" action={<button className="btn btn-sm btn-line" onClick={projects.reload}>Retry</button>}>
            {projects.error.message}
          </Notice>
        </div>
      )}

      {projects.loading && !projects.data ? (
        <div className="grid h-64 place-items-center text-ink/40">
          <Spinner size={20} />
        </div>
      ) : all.length === 0 && !projects.error ? (
        <EmptyState />
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            {awaiting.length > 0 && (
              <section aria-labelledby="review-title" className="mb-12">
                <h2 id="review-title" className="eyebrow mb-4 flex items-center gap-2 text-ink">
                  <span className="inline-block size-2 rotate-45 bg-signal" /> Awaiting your review · {awaiting.length}
                </h2>
                <ul className="divide-y divide-ink/10 border-y border-ink/15">
                  {awaiting.slice(0, 5).map(({ p, s }) => (
                    <li key={p.id + s.kind}>
                      <Link to={`/projects/${p.id}/${KIND_PATH[s.kind]}`} className="group flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                        <span className="text-[14px] font-semibold">
                          {p.brand.name} · {KIND_LABEL[s.kind]}
                        </span>
                        <span className="text-[13px] text-ink/60">{s.staleReason}. Check it still holds.</span>
                        <ArrowRight size={15} className="ml-auto hidden text-ink/40 transition group-hover:translate-x-0.5 group-hover:text-ink sm:block" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="eyebrow text-stone-dark">Projects</h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative block">
                  <span className="sr-only">Search projects</span>
                  <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-dark" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="input !py-2 pl-9 text-[14px] sm:w-48" />
                </label>
                <div className="scrollbar-none overflow-x-auto">
                  <Segmented
                    size="sm"
                    label="Filter projects"
                    value={filter}
                    onChange={setFilter}
                    options={[
                      { value: "all", label: "All" },
                      { value: "review", label: "Needs review" },
                      { value: "progress", label: "In progress" },
                      { value: "complete", label: "Complete" },
                    ]}
                  />
                </div>
              </div>
            </div>

            {shown.length === 0 ? (
              <p className="border-y border-ink/15 py-12 text-center text-[14px] text-ink/55">No projects match {q ? `“${q}”` : "this filter"}.</p>
            ) : (
              <ul className="border-t border-ink/15">
                {shown.map((p, i) => (
                  <li key={p.id} className="rise border-b border-ink/15" style={{ ["--i" as string]: Math.min(i, 8) }}>
                    <Link to={`/projects/${p.id}`} className="group grid grid-cols-[48px_1fr] items-center gap-x-5 gap-y-3 py-5 sm:grid-cols-[56px_1.4fr_1fr_auto]">
                      <BrandTile name={p.brand.name} direction={p.brand.direction} size={56} className="row-span-2 sm:row-span-1" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate font-display text-[22px] leading-tight font-semibold tracking-tight">
                          {p.brand.name}
                          {p.isDemo && <span className="chip !py-0.5 text-ink/50">Demo</span>}
                        </p>
                        <p className="mt-1 truncate text-[13px] text-ink/55">
                          {isComplete(p) ? "Core system approved" : p.progress.next ? `Next: ${p.progress.next.label}` : "In progress"} · updated {timeAgo(p.updatedAt)}
                        </p>
                      </div>
                      <div>
                        <WorkflowMeter summaries={p.summaries} />
                        <p className="mt-2 font-mono text-[11px] text-ink/50">
                          {p.progress.approved}/{p.progress.total} core approved{p.progress.stale ? ` · ${p.progress.stale} to review` : ""}
                        </p>
                      </div>
                      <ArrowUpRight size={18} className="hidden text-ink/30 transition group-hover:text-ink sm:block" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="lg:col-span-4" aria-labelledby="activity-title">
            <h2 id="activity-title" className="eyebrow mb-4 text-stone-dark">
              Recent activity
            </h2>
            {activity.data?.activity.length ? (
              <ol className="relative space-y-0 border-l border-ink/15 pl-5">
                {activity.data.activity.map((a) => (
                  <li key={a.id} className="relative pb-5">
                    <span className={cx("absolute top-1.5 -left-[24px] size-[7px] rotate-45", a.type === "approved" ? "bg-ink" : a.type === "generated" ? "bg-volt ring-1 ring-ink/40" : "bg-paper-3")} />
                    <p className="text-[14px] leading-snug">{a.message}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink/45">
                      {a.projectName ? `${a.projectName} · ` : ""}
                      {timeAgo(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[14px] text-ink/50">Approvals, generations and exports will appear here.</p>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <section className="grid gap-10 py-16 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <p className="font-serif text-4xl leading-tight italic">Every brand here starts as a sentence.</p>
        <p className="mt-5 max-w-md text-[16px] leading-relaxed text-ink/65">Describe what you're building. BrandFoundry turns it into a brief, then helps you position it, give it a voice and a name, design its identity, and test whether it all holds together.</p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Link to="/projects/new" className="btn btn-lg btn-ink">
            Start your first brand <ArrowRight size={16} />
          </Link>
          <Link to="/demo" className="btn btn-lg btn-line">
            Open the KORA demo
          </Link>
        </div>
      </div>
      <ol className="border-t border-ink/15 lg:col-span-5 lg:col-start-8">
        {["Write the brief", "Choose a positioning", "Shape voice and name", "Build the identity", "Challenge, validate, export"].map((s, i) => (
          <li key={s} className="flex items-baseline gap-4 border-b border-ink/10 py-4">
            <span className="font-mono text-[11px] text-stone-dark">0{i + 1}</span>
            <span className="text-[16px] font-medium">{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
