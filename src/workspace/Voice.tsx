import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { SLIDERS, type Voice as VoiceT } from "@shared/schemas";
import { voiceLint } from "@shared/consistency";
import { AutoTextarea, ChipInput, Field, ListEditor, cx } from "@/components/ui";
import { useArtifact } from "./useArtifact";
import { AiButton, NextStage, PageLoading, SectionTitle, StageHeader } from "./parts";

type Check = { verdict: "fits" | "partial" | "off"; reasons: { quote: string; issue: string; suggestion: string }[]; rewrite: string };

const describe = (v: number, l: string, r: string) => (v < 20 ? `Very ${l.toLowerCase()}` : v < 42 ? `Leans ${l.toLowerCase()}` : v <= 58 ? "Balanced" : v <= 80 ? `Leans ${r.toLowerCase()}` : `Very ${r.toLowerCase()}`);

export default function Voice() {
  const art = useArtifact("voice");
  const v = art.draft;
  if (!v) return <PageLoading />;
  const set = <K extends keyof VoiceT>(k: K, val: VoiceT[K]) => art.update((p) => ({ ...p, [k]: val }));

  return (
    <div>
      <StageHeader
        path="voice"
        title={
          <>
            How it sounds <span className="serif-em">when it speaks.</span>
          </>
        }
        intro="Set the personality on four axes, then write or generate guidelines calibrated to it. The checker on the right tests any line of copy against the voice."
        art={art}
        approveBlock={!v.summary.trim() && !v.principles.length ? "Write a voice summary or principles first" : null}
        extra={<AiButton label={v.principles.length ? "Regenerate guidelines" : "Generate guidelines"} busy={art.generating} onCancel={art.cancel} onRun={() => art.generate("voice")} hint="Uses the approved positioning and the sliders below" />}
      />

      <div className="grid gap-12 px-4 py-10 sm:px-8 lg:grid-cols-12 lg:px-12">
        <div className="min-w-0 space-y-14 lg:col-span-8">
          <section aria-labelledby="personality">
            <SectionTitle n="A">
              <span id="personality">Personality</span>
            </SectionTitle>
            <div className="space-y-7">
              {SLIDERS.map((s) => {
                const val = v.sliders[s.key];
                return (
                  <div key={s.key} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 sm:grid-cols-[110px_1fr_110px_120px]">
                    <span className={cx("text-[14px] transition sm:text-right", val < 45 ? "font-semibold" : "text-ink/50")}>{s.left}</span>
                    <span className={cx("text-right text-[14px] transition sm:order-3 sm:text-left", val > 55 ? "font-semibold" : "text-ink/50")}>{s.right}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={val}
                      aria-label={`${s.left} to ${s.right}`}
                      aria-valuetext={describe(val, s.left, s.right)}
                      onChange={(e) => set("sliders", { ...v.sliders, [s.key]: Number(e.target.value) })}
                      className="slider col-span-2 text-ink sm:order-2 sm:col-span-1"
                    />
                    <span className="col-span-2 font-mono text-[11px] text-ink/50 sm:order-4 sm:col-span-1">{describe(val, s.left, s.right)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="summary">
            <SectionTitle n="B">
              <span id="summary">Voice in a paragraph</span>
            </SectionTitle>
            <AutoTextarea aria-label="Voice summary" value={v.summary} maxLength={800} onChange={(e) => set("summary", e.target.value)} placeholder="Direct, warm and a little defiant…" className="font-serif !text-[20px] !leading-snug italic" />
          </section>

          <section aria-labelledby="principles">
            <SectionTitle
              n="C"
              aside={
                v.principles.length < 5 && (
                  <button className="btn btn-sm btn-line" onClick={() => set("principles", [...v.principles, { name: "", description: "", do: "", dont: "" }])}>
                    <Plus size={14} /> Principle
                  </button>
                )
              }
            >
              <span id="principles">Principles</span>
            </SectionTitle>
            {v.principles.length === 0 && <p className="text-[14px] text-ink/55">No principles yet. Add your own or generate them.</p>}
            <div className="space-y-6">
              {v.principles.map((pr, i) => {
                const patch = (x: Partial<typeof pr>) => set("principles", v.principles.map((y, j) => (j === i ? { ...y, ...x } : y)));
                return (
                  <article key={i} className="grid gap-4 border-t border-ink/10 pt-5 sm:grid-cols-[40px_1fr]">
                    <span className="font-mono text-[11px] text-stone-dark">{String(i + 1).padStart(2, "0")}</span>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input aria-label="Principle name" className="input font-display !text-[18px] font-semibold" value={pr.name} maxLength={60} placeholder="Principle" onChange={(e) => patch({ name: e.target.value })} />
                        <button className="btn btn-quiet text-ink/40" aria-label="Remove principle" onClick={() => set("principles", v.principles.filter((_, j) => j !== i))}>
                          <X size={15} />
                        </button>
                      </div>
                      <AutoTextarea aria-label="Principle description" value={pr.description} maxLength={400} placeholder="What it means" onChange={(e) => patch({ description: e.target.value })} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="eyebrow mb-1.5 block text-ink/70">Do</span>
                          <AutoTextarea value={pr.do} maxLength={300} onChange={(e) => patch({ do: e.target.value })} className="!border-l-2 !border-l-ink" />
                        </label>
                        <label className="block">
                          <span className="eyebrow mb-1.5 block text-signal">Don't</span>
                          <AutoTextarea value={pr.dont} maxLength={300} onChange={(e) => patch({ dont: e.target.value })} className="!border-l-2 !border-l-signal text-ink/70 line-through decoration-signal/40" />
                        </label>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="vocab" className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <SectionTitle n="D">
                <span id="vocab">Vocabulary</span>
              </SectionTitle>
            </div>
            <Field label="Words we use">
              <ChipInput label="Words we use" value={v.vocabulary.use} onChange={(use) => set("vocabulary", { ...v.vocabulary, use })} max={20} placeholder="Add a word" />
            </Field>
            <Field label="Words we avoid" hint="The consistency checker flags these anywhere in your strategy copy.">
              <ChipInput label="Words we avoid" value={v.vocabulary.avoid} onChange={(avoid) => set("vocabulary", { ...v.vocabulary, avoid })} max={20} placeholder="Add a word" />
            </Field>
          </section>

          <section aria-labelledby="pillars">
            <SectionTitle n="E">
              <span id="pillars">Messaging pillars & taglines</span>
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => {
                const pl = v.pillars[i] ?? { title: "", description: "" };
                const patch = (x: Partial<typeof pl>) => {
                  const next = [...v.pillars];
                  while (next.length <= i) next.push({ title: "", description: "" });
                  next[i] = { ...pl, ...x };
                  set("pillars", next);
                };
                return (
                  <div key={i} className="space-y-2 bg-sheet p-4 ring-1 ring-ink/10">
                    <span className="font-mono text-[10px] text-stone-dark">PILLAR {i + 1}</span>
                    <input aria-label={`Pillar ${i + 1} title`} className="w-full bg-transparent font-display text-[17px] font-semibold outline-none placeholder:text-ink/25" placeholder="Title" value={pl.title} maxLength={80} onChange={(e) => patch({ title: e.target.value })} />
                    <AutoTextarea aria-label={`Pillar ${i + 1} description`} value={pl.description} maxLength={400} placeholder="What we say about it" onChange={(e) => patch({ description: e.target.value })} className="!border-0 !bg-transparent !p-0 text-[13px]" />
                  </div>
                );
              })}
            </div>
            <div className="mt-6">
              <p className="field-label">Taglines</p>
              <ListEditor label="Tagline" value={v.taglines} onChange={(t) => set("taglines", t)} placeholder="tagline" max={8} />
            </div>
          </section>

          <section aria-labelledby="copy">
            <SectionTitle n="F">
              <span id="copy">Copy in context</span>
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <Field label="Website headline" htmlFor="v-h">
                <input id="v-h" className="input font-display !text-[18px] font-semibold" maxLength={160} value={v.websiteCopy.headline} onChange={(e) => set("websiteCopy", { ...v.websiteCopy, headline: e.target.value })} />
              </Field>
              <Field label="Call to action" htmlFor="v-cta">
                <input id="v-cta" className="input" maxLength={40} value={v.websiteCopy.cta} onChange={(e) => set("websiteCopy", { ...v.websiteCopy, cta: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Supporting line" htmlFor="v-sub">
                  <AutoTextarea id="v-sub" value={v.websiteCopy.subhead} maxLength={400} onChange={(e) => set("websiteCopy", { ...v.websiteCopy, subhead: e.target.value })} />
                </Field>
              </div>
            </div>
            {v.social.length > 0 && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {v.social.map((s, i) => (
                  <div key={i} className="bg-ink p-5 text-paper">
                    <p className="eyebrow text-paper/45">{s.platform}</p>
                    <AutoTextarea aria-label={`${s.platform} post`} value={s.text} maxLength={600} onChange={(e) => set("social", v.social.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className="input-dark mt-2 !border-0 !bg-transparent !p-0 text-[14px]" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:col-span-4">
          <VoiceChecker voice={v} run={(text) => art.generate<Check>("voice-check", { text }, { applies: false })} busy={art.generating} cancel={art.cancel} />
        </aside>
      </div>
      <NextStage path="voice" />
    </div>
  );
}

function VoiceChecker({ voice, run, busy, cancel }: { voice: VoiceT; run: (t: string) => Promise<Check | undefined>; busy: boolean; cancel: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Check | null>(null);
  const lint = useMemo(() => (text.trim() ? voiceLint(text, voice) : []), [text, voice]);
  return (
    <div className="sticky top-6 bg-ink p-6 text-paper">
      <p className="eyebrow text-paper/45">Voice checker</p>
      <p className="mt-2 text-[14px] text-paper/70">Paste any line of copy. Rule checks run instantly; the AI review explains tone.</p>
      <label htmlFor="vc" className="sr-only">
        Copy to check
      </label>
      <AutoTextarea id="vc" value={text} maxLength={3000} onChange={(e) => (setText(e.target.value), setResult(null))} placeholder="Our premium, eco-friendly tees elevate your style!" className="input-dark mt-4 min-h-28 text-[14px]" />

      <div className="mt-4 space-y-2" aria-live="polite">
        {lint.map((n, i) => (
          <p key={i} className="flex gap-2 text-[13px] leading-snug">
            <span className={cx("mt-1.5 inline-block size-1.5 shrink-0 rotate-45", n.kind === "use" ? "bg-volt" : n.kind === "avoid" ? "bg-signal" : "bg-amber")} />
            {n.message}
          </p>
        ))}
        {text.trim() && lint.length === 0 && <p className="text-[13px] text-paper/50">No rule issues. Rules only cover vocabulary, punctuation and length.</p>}
      </div>

      <div className="mt-5 border-t border-paper/10 pt-4">
        <AiButton dark label="Review tone with AI" busy={busy} onCancel={cancel} onRun={async () => setResult((await run(text)) ?? null)} disabled={text.trim().length < 3 ? "Enter some copy first" : !voice.summary && !voice.principles.length ? "Write the voice first" : null} />
      </div>
      {result && (
        <div className="fade-in mt-5 space-y-4">
          <p className={cx("inline-block px-2 py-1 font-mono text-[11px] uppercase", result.verdict === "fits" ? "bg-volt text-ink" : result.verdict === "partial" ? "bg-amber text-ink" : "bg-signal text-ink")}>
            {result.verdict === "fits" ? "Fits the voice" : result.verdict === "partial" ? "Partly fits" : "Off voice"}
          </p>
          {result.reasons.map((r, i) => (
            <div key={i} className="text-[13px] leading-relaxed">
              <p className="font-serif text-[15px] italic">“{r.quote}”</p>
              <p className="mt-1 text-paper/70">{r.issue}</p>
              <p className="mt-1 text-volt">→ {r.suggestion}</p>
            </div>
          ))}
          {result.rewrite && (
            <div className="border-t border-paper/10 pt-4">
              <p className="eyebrow text-paper/45">Rewrite</p>
              <p className="mt-2 text-[15px]">{result.rewrite}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
