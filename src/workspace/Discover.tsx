import { useEffect, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { BUDGETS, briefGaps, type Brief } from "@shared/schemas";
import { AutoTextarea, ChipInput, Field, Notice, cx } from "@/components/ui";
import { useArtifact } from "./useArtifact";
import { AiButton, NextStage, PageLoading, StageHeader } from "./parts";

const PERSONALITY = ["Bold", "Warm", "Playful", "Serious", "Premium", "Approachable", "Experimental", "Traditional", "Calm", "Rebellious", "Refined", "Honest"];

type Key = keyof Brief;
const SECTIONS: { title: string; lede: string; fields: { key: Key; label: string; hint?: string; kind?: "text" | "area" | "chips" | "budget"; placeholder?: string }[] }[] = [
  { title: "The idea", lede: "What it is, in plain words.", fields: [{ key: "idea", label: "Business idea", kind: "area", hint: "A few sentences. What you make or do, and what makes it different." }, { key: "industry", label: "Industry", placeholder: "e.g. Apparel · streetwear" }] },
  { title: "The people", lede: "Who it's for and what's wrong for them today.", fields: [{ key: "audience", label: "Audience", kind: "area", hint: "Be specific: age, place, behaviour, what they care about." }, { key: "problem", label: "Customer problem", kind: "area" }] },
  { title: "The business", lede: "Where it sells and how it makes money.", fields: [{ key: "market", label: "Market", placeholder: "e.g. India first, online" }, { key: "businessModel", label: "Business model", placeholder: "e.g. Direct-to-consumer drops" }, { key: "budget", label: "Brand budget", kind: "budget" }] },
  { title: "The character", lede: "How it should feel, and what it won't compromise on.", fields: [{ key: "personality", label: "Desired personality", kind: "chips", hint: "Pick up to six. These drive the voice sliders and consistency checks." }, { key: "values", label: "Values", kind: "chips" }] },
  { title: "The ambition", lede: "Why it exists and where it is going.", fields: [{ key: "mission", label: "Mission", kind: "area" }, { key: "vision", label: "Vision", kind: "area" }] },
];

const filled = (b: Brief, k: Key) => (Array.isArray(b[k]) ? (b[k] as unknown[]).length > 0 : String(b[k] ?? "").trim() !== "" && b[k] !== "unspecified");

export default function Discover() {
  const art = useArtifact("brief");
  const b = art.draft;
  const [open, setOpen] = useState<number | null>(null);
  // Open the first incomplete section once, on load. Deriving it live would collapse a section mid-typing.
  const loaded = !!b;
  useEffect(() => {
    if (!loaded || open !== null) return;
    const i = SECTIONS.findIndex((s) => s.fields.some((f) => !filled(b!, f.key)));
    setOpen(i === -1 ? 0 : i);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!b) return art.loadError ? <Notice tone="danger" title="Couldn't load the brief">{art.loadError.message}</Notice> : <PageLoading />;

  const current = open ?? -1;
  const gaps = briefGaps(b);
  const set = <K extends Key>(k: K, v: Brief[K]) => art.update((p) => ({ ...p, [k]: v }));
  const focusField = (k: Key) => {
    const i = SECTIONS.findIndex((s) => s.fields.some((f) => f.key === k));
    setOpen(i);
    setTimeout(() => document.getElementById(`brief-${k}`)?.focus(), 60);
  };
  const openAssumptions = b.assumptions.filter((a) => a.status === "open");

  return (
    <div>
      <StageHeader
        path="discover"
        title={
          <>
            The brief, <span className="serif-em">made specific.</span>
          </>
        }
        intro="Answer what you know. Leave what you don't; BrandFoundry can propose assumptions, and keeps them separate from your facts until you accept them."
        art={art}
        approveBlock={gaps.length ? `Complete before approving: ${gaps.join(", ")}` : null}
        extra={<AiButton label="Ask follow-up questions" busy={art.generating} onCancel={art.cancel} onRun={() => art.generate("brief-assist")} disabled={b.idea.trim().length < 12 ? "Describe the idea first" : null} />}
      />

      <div className="grid gap-10 px-4 py-10 sm:px-8 lg:grid-cols-12 lg:px-12">
        {/* Guided form */}
        <div className="lg:col-span-7">
          <ol className="border-t border-ink/15">
            {SECTIONS.map((s, i) => {
              const done = s.fields.filter((f) => filled(b, f.key)).length;
              const isOpen = current === i;
              return (
                <li key={s.title} className="border-b border-ink/15">
                  <button className="flex w-full items-center gap-4 py-5 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span className={cx("grid size-7 shrink-0 place-items-center rounded-full font-mono text-[11px] ring-1", done === s.fields.length ? "bg-ink text-paper ring-ink" : "ring-ink/25")}>{done === s.fields.length ? <Check size={13} /> : `0${i + 1}`}</span>
                    <span className="flex-1">
                      <span className="block font-display text-[21px] leading-tight font-semibold tracking-tight">{s.title}</span>
                      <span className="block text-[13px] text-ink/55">{s.lede}</span>
                    </span>
                    <span className="font-mono text-[11px] text-ink/45">
                      {done}/{s.fields.length}
                    </span>
                    <ChevronDown size={18} className={cx("text-ink/40 transition", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="fade-in space-y-6 pb-8 pl-11">
                      {s.fields.map((f) => (
                        <Field key={f.key} label={f.label} hint={f.hint} htmlFor={`brief-${f.key}`}>
                          {f.kind === "area" ? (
                            <AutoTextarea id={`brief-${f.key}`} value={b[f.key] as string} onChange={(e) => set(f.key, e.target.value as never)} maxLength={f.key === "idea" ? 2000 : 800} aria-invalid={gaps.includes(f.key) && f.key === "idea" && b.idea.length > 0} />
                          ) : f.kind === "chips" ? (
                            <ChipInput label={f.label} value={b[f.key] as string[]} onChange={(v) => set(f.key, v as never)} max={f.key === "personality" ? 6 : 8} suggestions={f.key === "personality" ? PERSONALITY : []} placeholder={f.key === "values" ? "Type a value, press Enter" : "Add your own"} />
                          ) : f.kind === "budget" ? (
                            <select id={`brief-${f.key}`} className="input" value={b.budget} onChange={(e) => set("budget", e.target.value as Brief["budget"])}>
                              {BUDGETS.map((x) => (
                                <option key={x} value={x}>
                                  {x === "unspecified" ? "Not specified" : x[0].toUpperCase() + x.slice(1)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input id={`brief-${f.key}`} className="input" value={b[f.key] as string} maxLength={400} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value as never)} />
                          )}
                        </Field>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {b.openQuestions.length > 0 && (
            <section className="mt-10" aria-labelledby="questions">
              <h2 id="questions" className="eyebrow mb-3 text-stone-dark">
                Follow-up questions · AI
              </h2>
              <ol className="space-y-2">
                {b.openQuestions.map((q, i) => (
                  <li key={i} className="flex gap-3 bg-sheet p-4 text-[14px] ring-1 ring-ink/10">
                    <span className="font-mono text-[11px] text-stone-dark">Q{i + 1}</span>
                    <span className="flex-1">{q}</span>
                    <button className="text-ink/40 hover:text-ink" aria-label="Dismiss question" onClick={() => set("openQuestions", b.openQuestions.filter((_, j) => j !== i))}>
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Live brief */}
        <aside className="lg:col-span-5">
          <div className="sticky top-6">
            <div className="cropmarks text-ink">
              <article className="bg-sheet p-6 shadow-[0_30px_60px_-40px_rgb(0_0_0/0.4)] ring-1 ring-ink/10 sm:p-8" aria-label="Live brand brief">
                <div className="flex items-baseline justify-between border-b border-ink pb-3">
                  <p className="font-display text-lg font-semibold tracking-tight">Brand brief</p>
                  <p className="font-mono text-[11px] text-ink/50">{art.record?.version ? `v${art.record.version}` : "draft"}</p>
                </div>
                <dl className="divide-y divide-ink/10">
                  {(["idea", "industry", "audience", "problem", "market", "businessModel", "personality", "values", "mission", "vision"] as Key[]).map((k) => {
                    const label = SECTIONS.flatMap((s) => s.fields).find((f) => f.key === k)!.label;
                    const v = b[k];
                    const has = filled(b, k);
                    return (
                      <div key={k} className="grid grid-cols-[100px_1fr] gap-3 py-3">
                        <dt className="pt-0.5 text-[12px] text-ink/50">{label}</dt>
                        <dd>
                          <button onClick={() => focusField(k)} className={cx("w-full text-left text-[14px] leading-relaxed transition hover:bg-volt/30", !has && "text-ink/35")}>
                            {has ? (Array.isArray(v) ? (v as string[]).join(" · ") : String(v)) : gaps.includes(k) ? "Required — add this" : "—"}
                          </button>
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                {openAssumptions.length > 0 && (
                  <div className="mt-6">
                    <p className="eyebrow mb-3 flex items-center gap-2 text-[#8a6a10]">
                      <span className="inline-block size-1.5 rotate-45 bg-amber" /> AI assumptions · not facts until accepted
                    </p>
                    <ul className="space-y-2">
                      {openAssumptions.map((a) => (
                        <li key={a.id} className="border-l-2 border-amber bg-paper p-3 text-[13px] leading-relaxed">
                          <span className="font-mono text-[10px] text-ink/50 uppercase">{a.field}</span>
                          <p className="mt-1">{a.text}</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              className="btn btn-sm btn-ink !py-1"
                              onClick={() =>
                                art.update((p) => {
                                  const key = a.field as Key;
                                  const fillable = key in p && typeof p[key] === "string" && !String(p[key]).trim();
                                  return { ...p, ...(fillable ? { [key]: a.text } : {}), assumptions: p.assumptions.map((x) => (x.id === a.id ? { ...x, status: "accepted" as const } : x)) };
                                })
                              }
                            >
                              Accept
                            </button>
                            <button className="btn btn-sm btn-quiet !py-1" onClick={() => art.update((p) => ({ ...p, assumptions: p.assumptions.map((x) => (x.id === a.id ? { ...x, status: "dismissed" as const } : x)) }))}>
                              Dismiss
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-6 border-t border-ink/10 pt-4 text-[12px] leading-relaxed text-ink/55">
                  {gaps.length ? `To approve: ${gaps.map((g) => (g === "idea" ? "a fuller idea (20+ characters)" : g)).join(", ")}.` : "Ready to approve. Approved briefs feed positioning, voice and naming."}
                </p>
              </article>
            </div>
          </div>
        </aside>
      </div>
      <NextStage path="discover" />
    </div>
  );
}
