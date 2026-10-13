import { useEffect, useState } from "react";
import { FileText, FileJson, FileCode2, Image as ImageIcon, FileType2 } from "lucide-react";
import { demoBrief, demoDirections, demoPositioning, demoVoice, DEMO_NAME } from "@shared/demo";
import { Logo, PaletteStrip } from "@/components/identity";
import { cx } from "@/components/ui";
import { prefersReducedMotion } from "@/lib/hooks";
import { FONTS } from "@shared/identity";

const STEPS = [
  { n: "01", label: "Raw idea" },
  { n: "02", label: "Strategy" },
  { n: "03", label: "Identity" },
  { n: "04", label: "Brand kit" },
] as const;
const DURATION = 5200;
/** The first stage is short so the transformation starts moving within the first seconds. */
const FIRST = 3200;

/**
 * Hero demonstration: one fictional brand moving through the real workflow stages, built from
 * the same demo data and identity renderer the workspace uses.
 */
export function FoundryPreview() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [auto] = useState(() => !prefersReducedMotion());
  const d = demoDirections[0];

  useEffect(() => {
    if (!auto || paused) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), step === 0 ? FIRST : DURATION);
    return () => clearTimeout(t);
  }, [step, paused, auto]);

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="cropmarks text-paper">
        <div className="overflow-hidden rounded-[3px] bg-ink-2 ring-1 ring-paper/10">
          <div role="tablist" aria-label="Transformation stages" className="grid grid-cols-4 border-b border-paper/10">
            {STEPS.map((s, i) => (
              <button
                key={s.n}
                role="tab"
                aria-selected={step === i}
                aria-controls="foundry-panel"
                onClick={() => setStep(i)}
                className={cx("relative px-2 py-3 text-left transition-colors sm:px-4", step === i ? "text-paper" : "text-paper/40 hover:text-paper/75")}
              >
                <span className="block font-mono text-[10px] tracking-widest">{s.n}</span>
                <span className="block truncate text-[12px] font-medium sm:text-[13px]">{s.label}</span>
                <span className="absolute inset-x-0 bottom-0 h-px bg-paper/10" />
                {step === i && <span key={`${step}-${paused}`} className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-volt" style={{ animation: auto && !paused ? `fill ${i === 0 ? FIRST : DURATION}ms linear both` : undefined }} />}
              </button>
            ))}
          </div>

          <div id="foundry-panel" role="tabpanel" aria-live="polite" className="relative h-[400px] sm:h-[440px]">
            {step === 0 && (
              <div key="0" className="fade-in flex h-full flex-col p-6 sm:p-8">
                <p className="eyebrow text-paper/40">Input · founder's notes</p>
                <p className="mt-5 font-serif text-[clamp(1.35rem,2.4vw,1.9rem)] leading-[1.25] text-paper/90 italic">
                  “sustainable streetwear for young indians… heavyweight tees, <span className="line-through decoration-signal/80">eco-friendly</span> undyed cotton? small runs with mills in Tiruppur. <span className="text-paper/40">who is it really for??</span>”
                </p>
                <div className="mt-auto space-y-2.5">
                  <p className="eyebrow text-paper/40">Extracted into the brief</p>
                  {[
                    ["Audience", "Urban 18–26s who follow drop culture"],
                    ["Problem", "Good streetwear is imported or disposable"],
                  ].map(([k, v], i) => (
                    <div key={k} className="rise flex gap-4 border-t border-paper/10 pt-2.5 text-[13px]" style={{ ["--i" as string]: i + 2 }}>
                      <span className="w-20 shrink-0 text-paper/45">{k}</span>
                      <span className="text-paper/90">{v}</span>
                    </div>
                  ))}
                  <div className="rise flex flex-wrap gap-1.5 border-t border-paper/10 pt-2.5" style={{ ["--i" as string]: 4 }}>
                    {demoBrief.personality.map((p) => (
                      <span key={p} className="chip border-paper/20 text-paper/80">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div key="1" className="fade-in flex h-full flex-col p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-paper/40">Positioning · 3 directions</p>
                  <span className="chip border-volt/60 text-volt">Approved</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-px bg-paper/10">
                  {demoPositioning.directions.map((dir, i) => (
                    <div key={dir.id} className={cx("bg-ink-2 p-3", i === 0 && "bg-paper text-ink")}>
                      <span className="font-mono text-[10px] opacity-60">{String.fromCharCode(65 + i)}</span>
                      <p className="mt-1 text-[12px] leading-tight font-semibold">{dir.title}</p>
                    </div>
                  ))}
                </div>
                <blockquote className="mt-6 font-serif text-[clamp(1.25rem,2.2vw,1.65rem)] leading-[1.25] text-paper italic">“{demoPositioning.final!.statement}”</blockquote>
                <div className="mt-auto grid grid-cols-2 gap-4 border-t border-paper/10 pt-4 text-[12px]">
                  <div>
                    <p className="text-paper/45">Promise</p>
                    <p className="mt-1 text-paper">{demoPositioning.final!.promise}</p>
                  </div>
                  <div>
                    <p className="text-paper/45">Voice</p>
                    <p className="mt-1 text-paper">{demoVoice.taglines[0]}</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div key="2" className="fade-in grid h-full grid-rows-[1fr_auto_auto]" style={{ background: d.palette.paper, color: d.palette.ink }}>
                <div className="grid place-items-center px-8 pt-6">
                  <Logo d={d} name={DEMO_NAME} className="wipe-in w-[78%] [&>svg]:max-h-32" />
                </div>
                <div className="flex items-end justify-between px-6 pb-4 sm:px-8">
                  <div>
                    <p className="eyebrow opacity-50">{d.name}</p>
                    <p className="mt-1 text-[13px] font-medium">
                      {FONTS[d.typography.display].family} / {FONTS[d.typography.text].family}
                    </p>
                  </div>
                  <Logo d={d} name={DEMO_NAME} variant="mark" className="size-12" />
                </div>
                <PaletteStrip d={d} labels={false} className="h-14" />
              </div>
            )}

            {step === 3 && (
              <div key="3" className="fade-in flex h-full flex-col p-6 sm:p-8">
                <p className="eyebrow text-paper/40">Brand kit · real files</p>
                <ul className="mt-5 divide-y divide-paper/10 border-y border-paper/10">
                  {[
                    [FileText, "kora-brand-guidelines.pdf", "PDF"],
                    [FileType2, "kora-strategy.md", "MD"],
                    [FileJson, "kora-tokens.json", "JSON"],
                    [FileCode2, "kora-variables.css", "CSS"],
                    [ImageIcon, "kora-logo-primary.svg", "SVG"],
                  ].map(([Icon, f, t], i) => {
                    const I = Icon as typeof FileText;
                    return (
                      <li key={f as string} className="rise flex items-center gap-3 py-2.5 text-[13px]" style={{ ["--i" as string]: i }}>
                        <I size={15} className="text-paper/50" />
                        <span className="truncate text-paper/90">{f as string}</span>
                        <span className="ml-auto font-mono text-[10px] text-paper/40">{t as string}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-auto flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 p-2" style={{ background: d.palette.paper }}>
                    <Logo d={d} name={DEMO_NAME} variant="mark" className="h-full w-full" />
                  </div>
                  <p className="text-[13px] leading-snug text-paper/60">Guidelines, tokens and logo files generated from the approved strategy and identity.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 font-mono text-[10px] tracking-wider text-paper/40 uppercase">
        <span className="inline-block size-1.5 rotate-45 bg-volt" /> Sample brand · KORA is fictional, shown for demonstration
      </p>
    </div>
  );
}
