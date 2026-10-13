import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { ARTIFACT_KINDS, PERSPECTIVES, SEVERITIES, uid, type ArtifactKind, type ChallengeFinding } from "@shared/schemas";
import { KIND_LABEL, KIND_PATH } from "@shared/workflow";
import { AutoTextarea, Dialog, Field, Segmented, cx } from "@/components/ui";
import { useArtifact } from "./useArtifact";
import { useWorkspace } from "./context";
import { AiButton, NextStage, PageLoading, StageHeader } from "./parts";

const PERSONA: Record<(typeof PERSPECTIVES)[number], string> = {
  customer: "Sceptical customer",
  strategist: "Brand strategist",
  designer: "Design director",
  investor: "Early-stage investor",
};

export default function Challenge() {
  const art = useArtifact("challenge");
  const { pid } = useWorkspace();
  const [who, setWho] = useState<"all" | (typeof PERSPECTIVES)[number]>("all");
  const [showResolved, setShowResolved] = useState(false);
  const [adding, setAdding] = useState(false);
  if (!art.draft) return <PageLoading />;
  const all = art.draft.findings;
  const shown = all.filter((f) => (who === "all" || f.perspective === who) && (showResolved || !f.resolved));
  const open = all.filter((f) => !f.resolved);

  return (
    <div>
      <StageHeader
        path="challenge"
        title={
          <>
            Argue with it <span className="serif-em">before the market does.</span>
          </>
        }
        intro="Four critical perspectives look for weak differentiation, credibility gaps, inconsistencies and practical risk. Each finding says whether it rests on evidence in your artifacts or on judgment."
        art={art}
        extra={<AiButton label={all.length ? "Run a fresh critique" : "Run critique"} busy={art.generating} onCancel={art.cancel} onRun={() => art.generate("challenge")} />}
      />

      <div className="px-4 py-10 sm:px-8 lg:px-12">
        <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] bg-ink/10 ring-1 ring-ink/10 sm:grid-cols-4">
          {SEVERITIES.map((s) => (
            <div key={s} className="bg-sheet p-5">
              <p className="eyebrow flex items-center gap-2 text-stone-dark">
                <Sev s={s} /> {s}
              </p>
              <p className="mt-2 font-display text-4xl font-semibold tracking-tight">{open.filter((f) => f.severity === s).length}</p>
            </div>
          ))}
          <div className="bg-sheet p-5">
            <p className="eyebrow text-stone-dark">Resolved</p>
            <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink/40">{all.length - open.length}</p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="scrollbar-none max-w-full overflow-x-auto">
            <Segmented size="sm" label="Perspective" value={who} onChange={setWho} options={[{ value: "all", label: "All" }, ...PERSPECTIVES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))]} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[13px] text-ink/70">
              <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="accent-ink" /> Show resolved
            </label>
            <button className="btn btn-sm btn-line" onClick={() => setAdding(true)}>
              <Plus size={14} /> Add finding
            </button>
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="border border-dashed border-ink/25 px-6 py-16 text-center">
            <p className="font-display text-2xl font-semibold tracking-tight">{all.length ? "Nothing open here." : "No critique yet."}</p>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-ink/60">{all.length ? "Every finding in this view is resolved." : "Run the critique once positioning, voice and identity exist, or record your own findings from reviews and conversations."}</p>
          </div>
        ) : (
          <ol className="border-t border-ink">
            {shown.map((f) => (
              <FindingRow key={f.id} f={f} pid={pid} onToggle={() => art.update((x) => ({ ...x, findings: x.findings.map((y) => (y.id === f.id ? { ...y, resolved: !y.resolved } : y)) }))} />
            ))}
          </ol>
        )}
      </div>
      <NextStage path="challenge" />
      <AddFinding
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(f) => {
          art.update((x) => ({ ...x, findings: [f, ...x.findings].slice(0, 24) }));
          setAdding(false);
        }}
      />
    </div>
  );
}

const Sev = ({ s }: { s: string }) => <span className={cx("inline-block size-2 rotate-45", s === "high" ? "bg-signal" : s === "medium" ? "bg-amber" : "bg-stone")} aria-hidden />;

function FindingRow({ f, pid, onToggle }: { f: ChallengeFinding; pid: string; onToggle: () => void }) {
  return (
    <li className={cx("grid gap-6 border-b border-ink/15 py-7 lg:grid-cols-[220px_1fr_200px]", f.resolved && "opacity-55")}>
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-[13px] font-semibold capitalize">
          <Sev s={f.severity} /> {f.severity}
        </p>
        <p className="text-[13px] text-ink/60">{PERSONA[f.perspective]}</p>
        <span className={cx("chip", f.basis === "evidence" ? "border-ink text-ink" : "border-dashed text-ink/60")}>{f.basis === "evidence" ? "Evidence-based" : "Judgment"}</span>
      </div>
      <div>
        <h3 className={cx("text-[22px] leading-snug font-semibold tracking-tight", f.resolved && "line-through decoration-1")}>{f.title}</h3>
        {f.evidence && <blockquote className="mt-3 border-l-2 border-ink/25 pl-4 font-serif text-[17px] leading-snug text-ink/75 italic">{f.evidence}</blockquote>}
        <p className="mt-3 text-[14px] leading-relaxed text-ink/70">{f.rationale}</p>
        <p className="mt-3 flex gap-2 text-[14px] leading-relaxed font-medium">
          <span className="text-ink/40">→</span> {f.action}
        </p>
      </div>
      <div className="flex flex-row flex-wrap items-start gap-2 lg:flex-col lg:items-end">
        <Link to={`/projects/${pid}/${KIND_PATH[f.affected]}`} className="btn btn-sm btn-line">
          {KIND_LABEL[f.affected]} <ArrowUpRight size={13} />
        </Link>
        <button className={cx("btn btn-sm", f.resolved ? "btn-line" : "btn-ink")} onClick={onToggle}>
          {f.resolved ? "Reopen" : (
            <>
              <Check size={13} /> Mark resolved
            </>
          )}
        </button>
      </div>
    </li>
  );
}

function AddFinding({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (f: ChallengeFinding) => void }) {
  const empty = { perspective: "strategist" as ChallengeFinding["perspective"], severity: "medium" as ChallengeFinding["severity"], affected: "positioning" as ArtifactKind, title: "", evidence: "", rationale: "", action: "" };
  const [f, setF] = useState(empty);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onAdd({ ...f, id: uid(), basis: f.evidence.trim() ? "evidence" : "judgment", resolved: false });
    setF(empty);
  };
  return (
    <Dialog open={open} onClose={onClose} title="Record a finding" wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <Field label="Perspective" htmlFor="af-p">
          <select id="af-p" className="input" value={f.perspective} onChange={(e) => setF({ ...f, perspective: e.target.value as typeof f.perspective })}>
            {PERSPECTIVES.map((p) => (
              <option key={p} value={p}>
                {PERSONA[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Severity" htmlFor="af-s">
          <select id="af-s" className="input" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value as typeof f.severity })}>
            {SEVERITIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Affects" htmlFor="af-a">
          <select id="af-a" className="input" value={f.affected} onChange={(e) => setF({ ...f, affected: e.target.value as ArtifactKind })}>
            {ARTIFACT_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-3">
          <Field label="Finding" htmlFor="af-t">
            <input id="af-t" className="input" required maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="Evidence" optional htmlFor="af-e" hint="Quote the artifact text this is about. With a quote, the finding is marked evidence-based; without one, judgment.">
            <AutoTextarea id="af-e" value={f.evidence} maxLength={600} onChange={(e) => setF({ ...f, evidence: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-3 grid gap-4 sm:grid-cols-2">
          <Field label="Why it matters" htmlFor="af-r">
            <AutoTextarea id="af-r" required value={f.rationale} maxLength={800} onChange={(e) => setF({ ...f, rationale: e.target.value })} />
          </Field>
          <Field label="Suggested action" htmlFor="af-x">
            <AutoTextarea id="af-x" required value={f.action} maxLength={600} onChange={(e) => setF({ ...f, action: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 sm:col-span-3">
          <button type="button" className="btn btn-line" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-ink" disabled={!f.title.trim() || !f.rationale.trim() || !f.action.trim()}>
            Add finding
          </button>
        </div>
      </form>
    </Dialog>
  );
}
