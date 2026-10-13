import { useState } from "react";
import { Check, PenLine } from "lucide-react";
import { DirectionSchema, type Direction } from "@shared/schemas";
import { AutoTextarea, ConfirmDialog, ListEditor, Segmented, cx } from "@/components/ui";
import { useArtifact } from "./useArtifact";
import { AiButton, NextStage, PageLoading, SectionTitle, StageHeader } from "./parts";

type TextKey = "title" | "statement" | "audience" | "problem" | "valueProp" | "promise" | "rationale";
type ListKey = "differentiators" | "tradeoffs" | "risks" | "messaging";
const ROWS: { key: TextKey | ListKey; label: string; list?: boolean }[] = [
  { key: "statement", label: "Positioning statement" },
  { key: "audience", label: "Target audience" },
  { key: "problem", label: "Core problem" },
  { key: "valueProp", label: "Value proposition" },
  { key: "differentiators", label: "Differentiators", list: true },
  { key: "promise", label: "Brand promise" },
  { key: "rationale", label: "Rationale" },
  { key: "tradeoffs", label: "Trade-offs", list: true },
  { key: "risks", label: "Risks", list: true },
  { key: "messaging", label: "Messaging implications", list: true },
];
const LETTER = (i: number) => String.fromCharCode(65 + i);

export default function Position() {
  const art = useArtifact("positioning");
  const [mobileCol, setMobileCol] = useState("0");
  const [pending, setPending] = useState<Direction | null>(null);
  const p = art.draft;
  if (!p) return <PageLoading />;
  const dirs = p.directions;

  const adopt = (d: Direction) => art.update((x) => ({ ...x, selectedId: d.id, final: { ...d, id: "final" } }));
  const choose = (d: Direction) => (p.final && JSON.stringify({ ...p.final, id: "" }) !== JSON.stringify({ ...d, id: "" }) && p.final.statement ? setPending(d) : adopt(d));
  const setFinal = (patch: Partial<Direction>) => art.update((x) => ({ ...x, final: { ...(x.final ?? DirectionSchema.parse({ id: "final" })), ...patch } }));

  return (
    <div>
      <StageHeader
        path="position"
        title={
          <>
            Three ways to win. <span className="serif-em">Pick one.</span>
          </>
        }
        intro="Compare genuinely different strategic directions side by side, then compose the final positioning. You can take any field from any direction and rewrite it."
        art={art}
        approveBlock={!p.final?.statement.trim() ? "Write or choose a positioning statement first" : null}
        extra={<AiButton label={dirs.length ? "Regenerate directions" : "Generate 3 directions"} busy={art.generating} onCancel={art.cancel} onRun={() => art.generate("positioning")} />}
      />

      <div className="px-4 py-10 sm:px-8 lg:px-12">
        <SectionTitle n="A">Directions</SectionTitle>
        {dirs.length === 0 ? (
          <div className="grid gap-6 border border-dashed border-ink/25 p-8 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
            <div>
              <p className="font-display text-2xl font-semibold tracking-tight">No directions yet.</p>
              <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-ink/60">Generate three contrasting directions from your approved brief, or skip straight to writing your own positioning below.</p>
            </div>
            <button className="btn btn-ink" onClick={() => setFinal({})}>
              <PenLine size={15} /> Write my own
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 lg:hidden">
              <Segmented label="Direction" value={mobileCol} onChange={setMobileCol} options={dirs.map((d, i) => ({ value: String(i), label: `${LETTER(i)} · ${d.title.split(" ").slice(0, 2).join(" ")}` }))} />
            </div>
            <div className="grid lg:grid-cols-[150px_repeat(var(--n),minmax(0,1fr))]" style={{ ["--n" as string]: dirs.length }}>
              {/* header row */}
              <div className="hidden border-b border-ink lg:block" />
              {dirs.map((d, i) => {
                const sel = p.selectedId === d.id;
                return (
                  <div key={d.id} className={cx("border-b border-ink p-5 lg:border-l lg:border-l-ink/10", String(i) !== mobileCol && "hidden lg:block", sel && "bg-ink text-paper")}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-display text-[3.5rem] leading-none font-semibold tracking-tighter opacity-25">{LETTER(i)}</span>
                      {sel ? (
                        <span className="chip border-volt text-volt">
                          <Check size={11} /> Selected
                        </span>
                      ) : (
                        <button className="btn btn-sm btn-line" onClick={() => choose(d)}>
                          Use this direction
                        </button>
                      )}
                    </div>
                    <h3 className="mt-3 text-[22px] leading-tight font-semibold tracking-tight">{d.title}</h3>
                  </div>
                );
              })}
              {ROWS.map((r) => (
                <Row key={r.key} label={r.label}>
                  {dirs.map((d, i) => {
                    const v = d[r.key];
                    const sel = p.selectedId === d.id;
                    return (
                      <div key={d.id} className={cx("border-b border-ink/10 p-5 text-[14px] leading-relaxed lg:border-l lg:border-l-ink/10", String(i) !== mobileCol && "hidden lg:block", sel && "bg-ink/[0.03]")}>
                        <p className="eyebrow mb-1.5 text-stone-dark lg:hidden">{r.label}</p>
                        {Array.isArray(v) ? (
                          <ul className="space-y-1.5">
                            {v.map((x, j) => (
                              <li key={j} className="flex gap-2">
                                <span className="mt-2 inline-block size-1 shrink-0 rotate-45 bg-ink/50" /> {x}
                              </li>
                            ))}
                          </ul>
                        ) : r.key === "statement" ? (
                          <p className="font-serif text-[19px] leading-snug italic">{v}</p>
                        ) : (
                          <p>{v}</p>
                        )}
                      </div>
                    );
                  })}
                </Row>
              ))}
            </div>
          </>
        )}

        {p.final && (
          <section className="mt-16" aria-labelledby="final">
            <SectionTitle n="B" aside={<span className="font-mono text-[11px] text-ink/50">Used by voice, naming, identity and critique</span>}>
              <span id="final">Final positioning</span>
            </SectionTitle>
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-8">
                {(["title", "statement", "audience", "problem", "valueProp", "promise", "rationale"] as TextKey[]).map((k) => (
                  <div key={k}>
                    <FieldLabel htmlFor={`f-${k}`} label={k === "title" ? "Direction name" : ROWS.find((r) => r.key === k)!.label} dirs={dirs} onTake={(d) => setFinal({ [k]: d[k] })} />
                    <AutoTextarea id={`f-${k}`} value={p.final![k]} maxLength={k === "title" ? 80 : 800} onChange={(e) => setFinal({ [k]: e.target.value })} className={k === "statement" ? "font-serif !text-[20px] italic" : undefined} />
                  </div>
                ))}
                {(["differentiators", "tradeoffs", "risks", "messaging"] as ListKey[]).map((k) => (
                  <div key={k}>
                    <FieldLabel label={ROWS.find((r) => r.key === k)!.label} dirs={dirs} onTake={(d) => setFinal({ [k]: d[k] })} />
                    <ListEditor label={k} value={p.final![k]} onChange={(v) => setFinal({ [k]: v })} placeholder={k.replace(/s$/, "")} />
                  </div>
                ))}
              </div>
              <aside className="lg:col-span-4">
                <div className="sticky top-6 bg-ink p-7 text-paper">
                  <p className="eyebrow text-paper/45">As it reads</p>
                  <p className="mt-4 font-serif text-[24px] leading-snug italic">“{p.final.statement || "Your positioning statement."}”</p>
                  {p.final.promise && (
                    <p className="mt-6 border-t border-paper/15 pt-4 text-[14px]">
                      <span className="text-paper/50">Promise · </span>
                      {p.final.promise}
                    </p>
                  )}
                </div>
              </aside>
            </div>
          </section>
        )}
      </div>
      <NextStage path="position" />
      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title="Replace your final positioning?"
        confirmLabel="Replace"
        body="Your edited final positioning will be replaced by this direction. The current text stays available in version history."
        onConfirm={() => adopt(pending!)}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="hidden border-b border-ink/10 py-5 pr-4 text-[12px] text-stone-dark lg:block">{label}</div>
      {children}
    </>
  );
}

function FieldLabel({ label, dirs, onTake, htmlFor }: { label: string; dirs: Direction[]; onTake: (d: Direction) => void; htmlFor?: string }) {
  return (
    <div className="field-label flex flex-wrap items-center gap-2">
      {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
      {dirs.length > 0 && (
        <span className="flex gap-1">
          {dirs.map((d, i) => (
            <button key={d.id} type="button" onClick={() => onTake(d)} title={`Take from ${d.title}`} className="rounded-[2px] px-1.5 font-mono text-[10px] font-normal text-ink/50 ring-1 ring-ink/15 transition hover:bg-ink hover:text-paper">
              {LETTER(i)}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
