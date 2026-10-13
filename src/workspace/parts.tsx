import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, History, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import type { ArtifactKind } from "@shared/schemas";
import { PAGES, KIND_LABEL } from "@shared/workflow";
import { useSession } from "@/lib/session";
import { Dialog, Notice, Spinner, cx } from "@/components/ui";
import type { ArtifactControls } from "./useArtifact";
import { useWorkspace } from "./context";

/** Page heading for a workflow stage: number, title, purpose and the artifact controls. */
export function StageHeader({ path, title, intro, art, approveBlock, dark, extra, compact }: { path: string; title: ReactNode; intro: ReactNode; art?: ArtifactControls; approveBlock?: string | null; dark?: boolean; extra?: ReactNode; compact?: boolean }) {
  const page = PAGES.find((p) => p.path === path)!;
  const { project } = useWorkspace();
  useEffect(() => {
    document.title = `${page.label} · ${project.brand.name} — BrandFoundry`;
  }, [page.label, project.brand.name]);
  return (
    <header className={cx("border-b px-4 sm:px-8 lg:px-12", compact ? "pt-6 pb-5 lg:pt-8" : "pt-8 pb-7 lg:pt-12", dark ? "border-paper/10" : "border-ink/15")}>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className={cx("eyebrow rise flex items-center gap-2", dark ? "text-paper/50" : "text-stone-dark")}>
            <span>{page.stage.n}</span>
            <span className={cx("h-px w-5", dark ? "bg-paper/30" : "bg-ink/30")} />
            <span>{page.stage.label}</span>
          </p>
          <h1 className={cx("rise mt-3 leading-[0.98] font-semibold tracking-[-0.04em]", compact ? "text-[clamp(1.9rem,3vw,2.6rem)]" : "text-[clamp(2.2rem,4.2vw,3.6rem)]")} style={{ ["--i" as string]: 1 }}>
            {title}
          </h1>
          <p className={cx("rise mt-3 max-w-2xl leading-relaxed", compact ? "text-[14px]" : "text-[15px]", dark ? "text-paper/60" : "text-ink/65")} style={{ ["--i" as string]: 2 }}>
            {intro}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 xl:items-end">
          {extra && <div className="flex flex-wrap items-center gap-2 xl:justify-end">{extra}</div>}
          {art && (
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <ArtifactBar art={art} approveBlock={approveBlock} dark={dark} />
            </div>
          )}
        </div>
      </div>
      {art?.record?.staleReason && <StaleNotice art={art} dark={dark} />}
    </header>
  );
}

function saveLabel(art: ArtifactControls) {
  const r = art.record;
  switch (art.saveState) {
    case "pending":
      return "Unsaved changes";
    case "saving":
      return "Saving…";
    case "error":
      return "Save failed";
    case "conflict":
      return "Changed elsewhere";
    default:
      return r && r.version ? `Saved · v${r.version}` : "Not started";
  }
}

export function ArtifactBar({ art, approveBlock, dark }: { art: ArtifactControls; approveBlock?: string | null; dark?: boolean }) {
  const [history, setHistory] = useState(false);
  const r = art.record;
  if (!r) return null;
  const approved = r.status === "approved" && art.saveState !== "pending";
  return (
    <>
      <span role="status" className={cx("mr-1 flex items-center gap-2 font-mono text-[11px]", dark ? "text-paper/55" : "text-ink/55", (art.saveState === "error" || art.saveState === "conflict") && "!text-signal")}>
        {art.saveState === "saving" && <Spinner size={11} />}
        {saveLabel(art)}
      </span>
      {art.saveState === "error" && (
        <button className="btn btn-sm btn-line" onClick={() => art.checkpoint()}>
          Retry
        </button>
      )}
      {art.saveState === "conflict" && (
        <button className="btn btn-sm btn-line" onClick={art.reload}>
          Reload latest
        </button>
      )}
      {r.versions.length > 0 && (
        <button className={cx("btn btn-sm btn-line", dark && "text-paper")} onClick={() => setHistory(true)}>
          <History size={14} /> History
        </button>
      )}
      {approved ? (
        <span className="flex items-center">
          <span className={cx("flex items-center gap-1.5 rounded-l-[3px] px-3 py-1.5 text-[13px] font-medium", dark ? "bg-volt text-ink" : "bg-ink text-paper")}>
            <Check size={14} strokeWidth={2.5} /> Approved v{r.approvedVersion}
          </span>
          <button title="Return to draft" aria-label="Return to draft" onClick={art.unapprove} className={cx("rounded-r-[3px] border-l px-2 py-1.5 transition", dark ? "border-ink/20 bg-volt text-ink hover:bg-white" : "border-paper/20 bg-ink text-paper hover:bg-graphite")}>
            <Undo2 size={14} />
          </button>
        </span>
      ) : (
        <button
          className="btn btn-sm btn-volt ring-1 ring-ink/20"
          disabled={r.status === "empty" || !!approveBlock || art.saveState === "saving"}
          title={approveBlock ?? (r.status === "empty" ? "Add content before approving" : "Approve this version for downstream stages")}
          onClick={art.approve}
        >
          <Check size={14} strokeWidth={2.5} /> Approve{r.version ? ` v${r.version}` : ""}
        </button>
      )}
      <VersionHistory open={history} onClose={() => setHistory(false)} art={art} />
    </>
  );
}

function VersionHistory({ open, onClose, art }: { open: boolean; onClose: () => void; art: ArtifactControls }) {
  const r = art.record!;
  return (
    <Dialog open={open} onClose={onClose} title={`${KIND_LABEL[r.kind]} · version history`} wide>
      <ol className="max-h-[60vh] divide-y divide-ink/10 overflow-y-auto border-y border-ink/10">
        {r.versions.map((v) => (
          <li key={v.version} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:gap-4">
            <span className="w-10 font-mono text-[13px] font-semibold">v{v.version}</span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[14px]">
                <span className={cx("chip !py-0.5", v.provenance.source === "ai" ? "border-ink bg-volt/50" : "text-ink/60")}>{v.provenance.source === "ai" ? `AI · ${v.provenance.model}` : v.provenance.source}</span>
                {v.version === r.approvedVersion && <span className="chip !py-0.5 border-ink bg-ink text-paper">Approved</span>}
                {v.version === r.version && <span className="chip !py-0.5 text-ink/60">Current</span>}
              </p>
              {v.provenance.note && <p className="mt-1.5 text-[13px] text-ink/70">{v.provenance.note}</p>}
              {v.provenance.upstream && Object.keys(v.provenance.upstream).length > 0 && (
                <p className="mt-1.5 font-mono text-[11px] text-ink/50">
                  Built from {Object.entries(v.provenance.upstream).map(([k, u]) => `${KIND_LABEL[k as ArtifactKind]} v${u!.version}${u!.approved ? "" : " (draft)"}`).join(", ")}
                </p>
              )}
              <p className="mt-1 font-mono text-[11px] text-ink/45">{new Date(v.createdAt).toLocaleString()}</p>
            </div>
            {v.version !== r.version && (
              <button className="btn btn-sm btn-line self-start" onClick={() => (art.restore(v.version), onClose())}>
                <RotateCcw size={13} /> Restore
              </button>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[12px] text-ink/55">Restoring creates a new version; nothing is deleted. Quick edits within 15 minutes are folded into one draft version.</p>
    </Dialog>
  );
}

function StaleNotice({ art, dark }: { art: ArtifactControls; dark?: boolean }) {
  return (
    <div className="mt-6">
      <Notice
        tone="danger"
        dark={dark}
        title={`Needs review: ${art.record!.staleReason}.`}
        action={
          <button className="btn btn-sm btn-ink" onClick={art.acknowledge}>
            <Check size={14} /> Still valid
          </button>
        }
      >
        This was built on an earlier version of its inputs. Nothing has been changed automatically. Check it against the update, then mark it still valid, edit it, or regenerate it.
      </Notice>
    </div>
  );
}

/** Primary AI action. Explains itself when AI is not configured instead of pretending. */
export function AiButton({ label, onRun, busy, onCancel, disabled, dark, hint }: { label: string; onRun: () => void; busy: boolean; onCancel: () => void; disabled?: string | null; dark?: boolean; hint?: string }) {
  const { ai } = useSession();
  if (busy)
    return (
      <span className="inline-flex items-center gap-2">
        <span className={cx("btn btn-sm pointer-events-none", dark ? "bg-paper/10 text-paper" : "bg-ink/[0.06]")}>
          <Spinner size={14} /> Generating with {ai.model}…
        </span>
        <button className={cx("btn btn-sm btn-quiet", dark ? "text-paper/70" : "text-ink/70")} onClick={onCancel}>
          Cancel
        </button>
      </span>
    );
  const reason = !ai.configured ? "AI isn't configured on this server. Add ANTHROPIC_API_KEY, or keep editing by hand." : disabled;
  return (
    <button className={cx("btn btn-sm btn-line", dark && "text-paper")} disabled={!!reason} onClick={onRun} title={reason ?? hint}>
      <Sparkles size={14} /> {label}
      {!ai.configured && <span className={cx("ml-1 rounded-[2px] px-1.5 py-px font-mono text-[9px] uppercase", dark ? "bg-paper/10" : "bg-ink/10")}>AI off</span>}
    </button>
  );
}

export function NextStage({ path, dark }: { path: string; dark?: boolean }) {
  const { pid } = useWorkspace();
  const i = PAGES.findIndex((p) => p.path === path);
  const next = PAGES[i + 1];
  if (!next) return null;
  return (
    <Link to={`/projects/${pid}/${next.path}`} className={cx("group flex items-center justify-between gap-6 border-t px-4 py-8 transition sm:px-8 lg:px-12", dark ? "border-paper/10 hover:bg-paper/[0.03]" : "border-ink/15 hover:bg-ink/[0.03]")}>
      <span>
        <span className={cx("eyebrow", dark ? "text-paper/45" : "text-stone-dark")}>Next · {next.stage.n} {next.stage.label}</span>
        <span className="mt-1 block font-display text-2xl font-semibold tracking-tight">{next.label}</span>
        <span className={cx("mt-1 block text-[14px]", dark ? "text-paper/55" : "text-ink/60")}>{next.blurb}</span>
      </span>
      <ArrowRight size={22} className="shrink-0 transition group-hover:translate-x-1" />
    </Link>
  );
}

export function PageLoading({ dark }: { dark?: boolean }) {
  return (
    <div className={cx("grid h-[60vh] place-items-center", dark ? "bg-ink text-paper/40" : "text-ink/40")}>
      <Spinner size={20} />
    </div>
  );
}

export function SectionTitle({ n, children, aside, dark }: { n?: string; children: ReactNode; aside?: ReactNode; dark?: boolean }) {
  return (
    <div className={cx("mb-5 flex items-end justify-between gap-4 border-b pb-3", dark ? "border-paper/10" : "border-ink/15")}>
      <h2 className="flex items-baseline gap-3 text-[19px] font-semibold tracking-tight">
        {n && <span className={cx("font-mono text-[11px] font-normal", dark ? "text-paper/40" : "text-stone-dark")}>{n}</span>}
        {children}
      </h2>
      {aside}
    </div>
  );
}
