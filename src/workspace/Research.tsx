import { useState, type FormEvent } from "react";
import { ExternalLink, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { CompetitorInputSchema, type Competitor, type CompetitorInput, type ResearchSource } from "@shared/schemas";
import { api, endpoints, type ApiError } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { AutoTextarea, ConfirmDialog, Dialog, Field, Notice, Spinner, cx, useToast } from "@/components/ui";
import { useArtifact } from "./useArtifact";
import { useWorkspace } from "./context";
import { AiButton, NextStage, PageLoading, SectionTitle, StageHeader } from "./parts";

const DIMENSIONS: { key: keyof CompetitorInput; label: string }[] = [
  { key: "positioning", label: "Positioning" },
  { key: "audience", label: "Audience" },
  { key: "messaging", label: "Messaging" },
  { key: "differentiation", label: "Differentiation" },
  { key: "visualNotes", label: "Visual patterns" },
];
const blank: CompetitorInput = { name: "", url: "", positioning: "", audience: "", messaging: "", differentiation: "", visualNotes: "", notes: "" };

export default function Research() {
  const { pid, refresh } = useWorkspace();
  const art = useArtifact("research");
  const data = useLoad(() => endpoints.competitors(pid), [pid]);
  const toast = useToast();
  const [editing, setEditing] = useState<(CompetitorInput & { id?: string }) | null>(null);
  const [removing, setRemoving] = useState<Competitor | null>(null);
  const [sourceFor, setSourceFor] = useState<Competitor | null>(null);

  if (!art.draft || !data.data) return <PageLoading />;
  const { competitors, sources } = data.data;
  const analysis = art.draft;

  return (
    <div>
      <StageHeader
        path="research"
        title={
          <>
            Know the field <span className="serif-em">you're entering.</span>
          </>
        }
        intro="Add the competitors you know, with what you've observed and where you saw it. The analysis works only from what you enter; anything beyond it is labelled as a hypothesis."
        art={art}
        extra={<AiButton label="Analyse competitors" busy={art.generating} onCancel={art.cancel} onRun={() => art.generate("research")} disabled={competitors.length ? null : "Add at least one competitor first"} />}
      />

      <div className="px-4 py-10 sm:px-8 lg:px-12">
        <Notice title="Live web research isn't connected." action={undefined}>
          BrandFoundry does not browse the web or invent sources. Record what you find, attach the URL as evidence, and use the analysis to structure it.
        </Notice>

        <section className="mt-10" aria-labelledby="matrix">
          <SectionTitle
            n="A"
            aside={
              <button className="btn btn-sm btn-ink" onClick={() => setEditing({ ...blank })} disabled={competitors.length >= 12}>
                <Plus size={14} /> Add competitor
              </button>
            }
          >
            <span id="matrix">Comparison matrix</span>
          </SectionTitle>

          {data.loading && !data.data ? (
            <Spinner />
          ) : competitors.length === 0 ? (
            <div className="grid place-items-center border border-dashed border-ink/25 px-6 py-16 text-center">
              <p className="font-display text-2xl font-semibold tracking-tight">No competitors yet.</p>
              <p className="mt-2 max-w-md text-[14px] text-ink/60">Start with two or three brands your audience already buys from. Note their promise, their tone and how they look.</p>
              <button className="btn btn-ink mt-6" onClick={() => setEditing({ ...blank })}>
                <Plus size={14} /> Add the first competitor
              </button>
            </div>
          ) : (
            <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
                <thead>
                  <tr>
                    <th className="w-36 border-b border-ink py-3 pr-4 align-bottom text-[12px] font-normal text-stone-dark" scope="col">
                      Dimension
                    </th>
                    {competitors.map((c) => (
                      <th key={c.id} scope="col" className="border-b border-ink px-4 py-3 align-bottom">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-display text-[16px] leading-tight font-semibold tracking-tight">{c.name}</span>
                          <span className="flex shrink-0 gap-0.5">
                            <button className="rounded-[2px] p-1 text-ink/40 hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
                              <Pencil size={13} />
                            </button>
                            <button className="rounded-[2px] p-1 text-ink/40 hover:bg-ink/5 hover:text-signal" aria-label={`Remove ${c.name}`} onClick={() => setRemoving(c)}>
                              <Trash2 size={13} />
                            </button>
                          </span>
                        </div>
                        {c.url && (
                          <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-normal text-ink/50 hover:text-ink">
                            {new URL(c.url).hostname} <ExternalLink size={10} />
                          </a>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DIMENSIONS.map((d) => (
                    <tr key={d.key} className="border-b border-ink/10 align-top">
                      <th scope="row" className="py-3.5 pr-4 text-[12px] font-normal text-stone-dark">
                        {d.label}
                      </th>
                      {competitors.map((c) => (
                        <td key={c.id} className={cx("px-4 py-3.5 leading-relaxed", !c[d.key] && "text-ink/30")}>
                          {c[d.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="align-top">
                    <th scope="row" className="py-3.5 pr-4 text-[12px] font-normal text-stone-dark">
                      Evidence
                    </th>
                    {competitors.map((c) => {
                      const mine = sources.filter((s) => s.competitorId === c.id);
                      return (
                        <td key={c.id} className="px-4 py-3.5">
                          <ul className="space-y-1.5">
                            {mine.map((s) => (
                              <SourceItem key={s.id} s={s} onRemove={async () => (await api(`/projects/${pid}/sources/${s.id}`, { method: "DELETE" }), data.reload())} />
                            ))}
                          </ul>
                          <button className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink/55 hover:text-ink" onClick={() => setSourceFor(c)}>
                            <Link2 size={12} /> Add source
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-14" aria-labelledby="analysis">
          <SectionTitle n="B">
            <span id="analysis">Analysis</span>
          </SectionTitle>
          {analysis.patterns.length === 0 && analysis.gaps.length === 0 && !analysis.summary ? (
            <p className="max-w-xl text-[14px] leading-relaxed text-ink/60">No analysis yet. Run it once you've added competitors, or write your own summary below. Every pattern is labelled with its basis: your notes, or a hypothesis.</p>
          ) : (
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <h3 className="eyebrow mb-3 text-stone-dark">Patterns</h3>
                <ul className="divide-y divide-ink/10 border-y border-ink/10">
                  {analysis.patterns.map((p, i) => (
                    <li key={i} className="grid grid-cols-[110px_1fr] gap-4 py-4">
                      <div>
                        <p className="text-[12px] font-medium capitalize">{p.dimension}</p>
                        <Basis b={p.basis} />
                      </div>
                      <div>
                        <p className="text-[14px] leading-relaxed">{p.observation}</p>
                        {p.competitors.length > 0 && <p className="mt-1 font-mono text-[11px] text-ink/50">{p.competitors.join(" · ")}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-5">
                <h3 className="eyebrow mb-3 text-stone-dark">Possible gaps</h3>
                <ul className="space-y-3">
                  {analysis.gaps.map((g, i) => (
                    <li key={i} className="bg-ink p-5 text-paper">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display text-[17px] leading-snug font-semibold">{g.gap}</p>
                        <Basis b={g.basis} dark />
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-paper/65">{g.rationale}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="mt-8 max-w-3xl">
            <Field label="Summary" hint="Your own read of the landscape. Positioning uses this as an input." htmlFor="research-summary">
              <AutoTextarea id="research-summary" value={analysis.summary} maxLength={1500} onChange={(e) => art.update((p) => ({ ...p, summary: e.target.value }))} />
            </Field>
          </div>
        </section>
      </div>
      <NextStage path="research" />

      <CompetitorDialog
        value={editing}
        onClose={() => setEditing(null)}
        onSave={async (c) => {
          try {
            if (c.id) await api(`/projects/${pid}/competitors/${c.id}`, { method: "PATCH", body: CompetitorInputSchema.parse(c) });
            else await api(`/projects/${pid}/competitors`, { body: CompetitorInputSchema.parse(c) });
            setEditing(null);
            data.reload();
            refresh();
            toast(c.id ? "Competitor updated" : "Competitor added", "success");
          } catch (e) {
            toast((e as ApiError).message ?? "Check the fields", "error");
          }
        }}
      />
      <SourceDialog
        competitor={sourceFor}
        onClose={() => setSourceFor(null)}
        onSave={async (s) => {
          try {
            await api(`/projects/${pid}/sources`, { body: { ...s, competitorId: sourceFor!.id } });
            setSourceFor(null);
            data.reload();
          } catch (e) {
            toast((e as ApiError).message, "error");
          }
        }}
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        danger
        title={`Remove ${removing?.name}?`}
        confirmLabel="Remove"
        body="The competitor and its evidence links will be deleted. Existing analysis versions are kept."
        onConfirm={async () => {
          await api(`/projects/${pid}/competitors/${removing!.id}`, { method: "DELETE" });
          data.reload();
        }}
      />
    </div>
  );
}

function Basis({ b, dark }: { b: "entered-evidence" | "ai-hypothesis"; dark?: boolean }) {
  return b === "entered-evidence" ? (
    <span className={cx("mt-1 inline-block font-mono text-[10px] uppercase", dark ? "text-volt" : "text-ink/60")}>From your notes</span>
  ) : (
    <span className={cx("mt-1 inline-block shrink-0 rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] uppercase", dark ? "bg-paper/10 text-paper/70" : "bg-amber/30 text-[#6b520c]")}>Hypothesis</span>
  );
}

function SourceItem({ s, onRemove }: { s: ResearchSource; onRemove: () => void }) {
  let host = s.url;
  try {
    host = new URL(s.url).hostname;
  } catch {
    /* stored URLs are validated server-side */
  }
  return (
    <li className="group flex items-start gap-1 text-[12px]">
      <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 flex-1 underline decoration-ink/25 underline-offset-2 hover:decoration-ink" title={s.excerpt || s.url}>
        {s.title || host}
      </a>
      <button className="text-ink/30 opacity-0 group-hover:opacity-100 hover:text-signal focus:opacity-100" aria-label="Remove source" onClick={onRemove}>
        <Trash2 size={11} />
      </button>
    </li>
  );
}

function CompetitorDialog({ value, onClose, onSave }: { value: (CompetitorInput & { id?: string }) | null; onClose: () => void; onSave: (c: CompetitorInput & { id?: string }) => Promise<void> }) {
  const [c, setC] = useState(value ?? blank);
  const [busy, setBusy] = useState(false);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setC(value ?? blank);
  }
  const urlOk = !c.url || /^https?:\/\/\S+\.\S+/.test(c.url);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await onSave(c);
    setBusy(false);
  };
  return (
    <Dialog open={!!value} onClose={onClose} title={value?.id ? `Edit ${value.name}` : "Add competitor"} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name">
          <input id="c-name" className="input" required maxLength={120} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
        </Field>
        <Field label="Website" optional htmlFor="c-url" hint={urlOk ? undefined : "Use a full URL starting with https://"}>
          <input id="c-url" className="input" type="url" placeholder="https://" value={c.url} aria-invalid={!urlOk} onChange={(e) => setC({ ...c, url: e.target.value })} />
        </Field>
        {DIMENSIONS.map((d) => (
          <Field key={d.key} label={d.label} optional htmlFor={`c-${d.key}`}>
            <AutoTextarea id={`c-${d.key}`} value={c[d.key]} maxLength={800} onChange={(e) => setC({ ...c, [d.key]: e.target.value })} />
          </Field>
        ))}
        <Field label="Notes" optional htmlFor="c-notes">
          <AutoTextarea id="c-notes" value={c.notes} maxLength={1000} onChange={(e) => setC({ ...c, notes: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn btn-line" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-ink" disabled={busy || !c.name.trim() || !urlOk}>
            {busy && <Spinner size={14} />} Save
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function SourceDialog({ competitor, onClose, onSave }: { competitor: Competitor | null; onClose: () => void; onSave: (s: { url: string; title: string; excerpt: string }) => Promise<void> }) {
  const [s, setS] = useState({ url: "", title: "", excerpt: "" });
  const ok = /^https?:\/\/\S+\.\S+/.test(s.url);
  return (
    <Dialog open={!!competitor} onClose={onClose} title={`Evidence for ${competitor?.name ?? ""}`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSave(s);
          setS({ url: "", title: "", excerpt: "" });
        }}
      >
        <Field label="URL" htmlFor="s-url">
          <input id="s-url" className="input" type="url" required placeholder="https://" value={s.url} onChange={(e) => setS({ ...s, url: e.target.value })} />
        </Field>
        <Field label="Title" optional htmlFor="s-title">
          <input id="s-title" className="input" maxLength={200} value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} />
        </Field>
        <Field label="What it shows" optional htmlFor="s-ex" hint="Quote or paraphrase what you observed at this link.">
          <AutoTextarea id="s-ex" value={s.excerpt} maxLength={1200} onChange={(e) => setS({ ...s, excerpt: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-line" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-ink" disabled={!ok}>
            Add source
          </button>
        </div>
      </form>
    </Dialog>
  );
}
