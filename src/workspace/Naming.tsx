import { useRef, useState, type FormEvent } from "react";
import { Check, Plus, Star, Trash2, X } from "lucide-react";
import { NAME_STYLES, type NamingCandidate } from "@shared/schemas";
import { api, endpoints, type ApiError } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { AutoTextarea, ChipInput, Dialog, Field, Notice, Segmented, Spinner, cx, useToast } from "@/components/ui";
import { useArtifact } from "./useArtifact";
import { useWorkspace } from "./context";
import { AiButton, NextStage, PageLoading, SectionTitle, StageHeader } from "./parts";

type Filter = "all" | "shortlisted" | "rejected";

export default function Naming() {
  const { pid, refresh } = useWorkspace();
  const { ai } = useSession();
  const art = useArtifact("naming");
  const names = useLoad(() => endpoints.names(pid), [pid]);
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const [rejecting, setRejecting] = useState<NamingCandidate | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  if (!art.draft || !names.data) return <PageLoading />;
  const list = names.data.names;
  const shown = list.filter((n) => (filter === "all" ? n.status !== "rejected" : n.status === filter));
  const chosen = art.draft.chosen;

  const patch = async (n: NamingCandidate, body: Partial<NamingCandidate>) => {
    names.setData({ names: list.map((x) => (x.id === n.id ? { ...x, ...body } : x)) });
    try {
      await api(`/projects/${pid}/names/${n.id}`, { method: "PATCH", body });
    } catch (e) {
      toast((e as ApiError).message, "error");
      names.reload();
    }
  };
  const choose = (name: string | null) => {
    art.update((p) => ({ ...p, chosen: name }));
    setTimeout(refresh, 1200);
  };
  const generate = async () => {
    setGenBusy(true);
    ctrl.current = new AbortController();
    try {
      const r = await api<{ result: { added: number } }>(`/projects/${pid}/ai/naming`, { body: {}, signal: ctrl.current.signal });
      toast(`${r.result.added} new candidates added`, "success");
      names.reload();
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast((e as ApiError).message, "error");
    } finally {
      setGenBusy(false);
    }
  };

  return (
    <div>
      <StageHeader
        path="naming"
        title={
          <>
            A name worth <span className="serif-em">saying out loud.</span>
          </>
        }
        intro="Collect candidates, note their drawbacks honestly, shortlist the strongest and choose one. Availability is never guessed: BrandFoundry has no trademark or domain provider connected."
        art={art}
        approveBlock={!chosen ? "Choose a name first" : null}
        extra={<AiButton label="Suggest names" busy={genBusy} onCancel={() => (ctrl.current?.abort(), toast("Cancelled.", "info"))} onRun={generate} />}
      />

      <div className="grid gap-12 px-4 py-10 sm:px-8 lg:grid-cols-12 lg:px-12">
        <div className="min-w-0 lg:col-span-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              size="sm"
              label="Filter names"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `Candidates · ${list.filter((n) => n.status !== "rejected").length}` },
                { value: "shortlisted", label: `Shortlist · ${list.filter((n) => n.status === "shortlisted").length}` },
                { value: "rejected", label: `Rejected · ${list.filter((n) => n.status === "rejected").length}` },
              ]}
            />
            <button className="btn btn-sm btn-ink" onClick={() => setAdding(true)}>
              <Plus size={14} /> Add a name
            </button>
          </div>

          {shown.length === 0 ? (
            <div className="border border-dashed border-ink/25 px-6 py-14 text-center">
              <p className="font-display text-2xl font-semibold tracking-tight">{filter === "all" ? "No candidates yet." : `Nothing ${filter}.`}</p>
              <p className="mx-auto mt-2 max-w-md text-[14px] text-ink/60">{filter === "all" ? (ai.configured ? "Add your own ideas or ask for suggestions based on the positioning and voice." : "Add your own ideas. Each one can carry a rationale, pronunciation and drawbacks.") : "Move candidates here from the main list."}</p>
            </div>
          ) : (
            <ul className="border-t border-ink/15">
              {shown.map((n) => {
                const isChosen = chosen === n.name;
                return (
                  <li key={n.id} className={cx("grid gap-x-6 gap-y-3 border-b border-ink/15 px-3 py-6 sm:grid-cols-[1fr_auto] sm:px-4", isChosen && "bg-ink/[0.04]")}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <h3 className={cx("font-display text-[clamp(1.8rem,3.2vw,2.6rem)] leading-none font-semibold tracking-[-0.035em]", n.status === "rejected" && "text-ink/35 line-through decoration-2")}>{n.name}</h3>
                        {n.pronunciation && <span className="font-mono text-[12px] text-ink/55">/{n.pronunciation}/</span>}
                        <span className="chip text-ink/55">{n.style}</span>
                        {n.source === "ai" && <span className="chip border-ink/40 bg-volt/40 text-ink">AI</span>}
                        {isChosen && (
                          <span className="chip border-ink bg-ink text-paper">
                            <Check size={11} /> Chosen
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid gap-4 text-[14px] leading-relaxed sm:grid-cols-2">
                        <p>
                          <span className="eyebrow mb-1 block text-stone-dark">Rationale</span>
                          {n.rationale || <span className="text-ink/35">—</span>}
                        </p>
                        <p>
                          <span className="eyebrow mb-1 block text-signal">Drawbacks</span>
                          {n.drawbacks || <span className="text-ink/35">None noted yet</span>}
                        </p>
                      </div>
                      {n.status === "rejected" && n.rejectionNote && <p className="mt-3 border-l-2 border-ink/20 pl-3 text-[13px] text-ink/60">Rejected: {n.rejectionNote}</p>}
                      <p className="mt-3 font-mono text-[10px] tracking-wide text-ink/45 uppercase">Trademark & domain: not checked</p>
                    </div>
                    <div className="flex flex-wrap items-start gap-1.5 sm:flex-col sm:items-end">
                      <button className={cx("btn btn-sm btn-quiet", n.favorite ? "text-ink" : "text-ink/35")} aria-pressed={n.favorite} aria-label={n.favorite ? "Unfavourite" : "Favourite"} onClick={() => patch(n, { favorite: !n.favorite })}>
                        <Star size={16} fill={n.favorite ? "currentColor" : "none"} />
                      </button>
                      {n.status === "rejected" ? (
                        <button className="btn btn-sm btn-line" onClick={() => patch(n, { status: "candidate" })}>
                          Restore
                        </button>
                      ) : (
                        <>
                          {isChosen ? (
                            <button className="btn btn-sm btn-line" onClick={() => choose(null)}>
                              Unchoose
                            </button>
                          ) : (
                            <button className="btn btn-sm btn-ink" onClick={() => (choose(n.name), n.status !== "shortlisted" && patch(n, { status: "shortlisted" }))}>
                              Choose
                            </button>
                          )}
                          <button className="btn btn-sm btn-line" onClick={() => patch(n, { status: n.status === "shortlisted" ? "candidate" : "shortlisted" })}>
                            {n.status === "shortlisted" ? "Unshortlist" : "Shortlist"}
                          </button>
                          <button className="btn btn-sm btn-quiet text-ink/50" onClick={() => setRejecting(n)} disabled={isChosen}>
                            <X size={14} /> Reject
                          </button>
                        </>
                      )}
                      {n.status === "rejected" && (
                        <button
                          className="btn btn-sm btn-quiet text-ink/40 hover:text-signal"
                          aria-label={`Delete ${n.name}`}
                          onClick={async () => {
                            await api(`/projects/${pid}/names/${n.id}`, { method: "DELETE" });
                            names.reload();
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <div className="bg-ink p-6 text-paper">
            <p className="eyebrow text-paper/45">Chosen name</p>
            <p className="mt-3 font-display text-5xl leading-none font-semibold tracking-[-0.04em] break-words">{chosen ?? <span className="text-paper/25">—</span>}</p>
            <p className="mt-4 text-[13px] leading-relaxed text-paper/60">{chosen ? "Used in logos, the brand kit and every downstream stage." : "Until you choose, the project name is used as a stand-in."}</p>
          </div>
          <div>
            <SectionTitle>Naming criteria</SectionTitle>
            <ChipInput label="Naming criteria" value={art.draft.criteria} onChange={(criteria) => art.update((p) => ({ ...p, criteria }))} max={8} placeholder="e.g. Two syllables max" />
            <p className="field-hint">Suggestions are asked to meet these.</p>
          </div>
          <Notice title="No availability checks">Trademark, company-name and domain availability are not checked. Treat every name as uncleared until a professional search says otherwise.</Notice>
        </aside>
      </div>
      <NextStage path="naming" />

      <AddNameDialog
        open={adding}
        onClose={() => setAdding(false)}
        onSave={async (body) => {
          try {
            await api(`/projects/${pid}/names`, { body });
            setAdding(false);
            names.reload();
          } catch (e) {
            toast((e as ApiError).message, "error");
          }
        }}
      />
      <RejectDialog
        candidate={rejecting}
        onClose={() => setRejecting(null)}
        onReject={async (note) => {
          await patch(rejecting!, { status: "rejected", rejectionNote: note });
          setRejecting(null);
        }}
      />
    </div>
  );
}

function AddNameDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (b: Record<string, string>) => Promise<void> }) {
  const [f, setF] = useState({ name: "", style: "evocative", rationale: "", pronunciation: "", drawbacks: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await onSave(f);
    setBusy(false);
    setF({ name: "", style: "evocative", rationale: "", pronunciation: "", drawbacks: "" });
  };
  return (
    <Dialog open={open} onClose={onClose} title="Add a name" wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="n-name">
          <input id="n-name" className="input font-display !text-xl font-semibold" required maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Style" htmlFor="n-style">
          <select id="n-style" className="input" value={f.style} onChange={(e) => setF({ ...f, style: e.target.value })}>
            {NAME_STYLES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Pronunciation" optional htmlFor="n-pr">
          <input id="n-pr" className="input" maxLength={80} value={f.pronunciation} onChange={(e) => setF({ ...f, pronunciation: e.target.value })} placeholder="KOH-rah" />
        </Field>
        <div />
        <Field label="Rationale" optional htmlFor="n-ra">
          <AutoTextarea id="n-ra" value={f.rationale} maxLength={600} onChange={(e) => setF({ ...f, rationale: e.target.value })} />
        </Field>
        <Field label="Drawbacks" optional htmlFor="n-dr">
          <AutoTextarea id="n-dr" value={f.drawbacks} maxLength={600} onChange={(e) => setF({ ...f, drawbacks: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn btn-line" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-ink" disabled={busy || !f.name.trim()}>
            {busy && <Spinner size={14} />} Add
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function RejectDialog({ candidate, onClose, onReject }: { candidate: NamingCandidate | null; onClose: () => void; onReject: (note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  return (
    <Dialog open={!!candidate} onClose={onClose} title={`Reject ${candidate?.name ?? ""}?`}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onReject(note);
          setNote("");
        }}
      >
        <Field label="Why?" optional htmlFor="rej" hint="A short note helps when you revisit the list.">
          <AutoTextarea id="rej" value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-line" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-ink">Reject</button>
        </div>
      </form>
    </Dialog>
  );
}
