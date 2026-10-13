import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { demoBrief, demoChallenge, demoDirections, demoIdentity, demoNaming, demoPositioning, demoVoice, DEMO_NAME } from "@shared/demo";
import { evaluate } from "@shared/consistency";
import { SLIDERS } from "@shared/schemas";
import { FONTS } from "@shared/identity";
import { Wordmark } from "@/components/Brand";
import { Logo, PaletteStrip } from "@/components/identity";
import { Segmented, cx } from "@/components/ui";
import { useReveal } from "@/lib/hooks";
import { FoundryPreview } from "./FoundryPreview";
import { StudioDemo } from "./StudioDemo";

const NAV = [
  { href: "#what", label: "What We Do" },
  { href: "#how", label: "How It Works" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#studio", label: "Brand Studio" },
];

export default function Landing() {
  const ref = useReveal<HTMLDivElement>();
  useEffect(() => {
    document.title = "BrandFoundry — Build a brand that knows what it stands for";
  }, []);
  return (
    <div ref={ref} className="bg-ink text-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-volt focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <TopNav />
      <main id="main">
        <Hero />
        <WorkflowBand />
        <WhatWeDo />
        <Transformation />
        <HowItWorks />
        <Studio />
        <Differentiators />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ───────────────────────── Navigation ───────────────────────── */

function TopNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => void (document.body.style.overflow = "");
  }, [open]);

  return (
    <header className={cx("sticky top-0 z-50 border-b transition-colors duration-300", scrolled || open ? "border-paper/10 bg-ink/95 backdrop-blur" : "border-transparent bg-ink")}>
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-8" aria-label="Primary">
        <Link to="/" aria-label="BrandFoundry home" className="shrink-0">
          <Wordmark size={24} />
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <li key={n.href}>
              <a href={n.href} className="rounded-[3px] px-3 py-2 text-[13px] text-paper/70 transition hover:text-paper">
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Link to="/demo" className="btn btn-sm btn-line hidden text-paper sm:inline-flex">
            Explore Demo
          </Link>
          <Link to="/projects/new" className="btn btn-sm btn-volt">
            Build Your Brand
          </Link>
          <button className="btn btn-quiet -mr-2 lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
      {open && (
        <div id="mobile-nav" className="fade-in fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-ink px-4 pt-6 pb-8 lg:hidden">
          <ul className="divide-y divide-paper/10 border-y border-paper/10">
            {NAV.map((n, i) => (
              <li key={n.href} className="rise" style={{ ["--i" as string]: i }}>
                <a href={n.href} onClick={() => setOpen(false)} className="flex items-center justify-between py-5 font-display text-3xl font-semibold tracking-tight">
                  {n.label}
                  <span className="font-mono text-[11px] text-paper/40">0{i + 1}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-auto grid gap-2">
            <Link to="/projects/new" className="btn btn-lg btn-volt">
              Build Your Brand
            </Link>
            <Link to="/demo" className="btn btn-lg btn-line text-paper">
              Explore a Demo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <div className="grain pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto grid max-w-[1440px] gap-12 px-4 pt-10 pb-16 sm:px-8 sm:pt-16 lg:grid-cols-12 lg:gap-8 lg:pt-20 lg:pb-24">
        <div className="lg:col-span-7 lg:pr-6">
          <p className="eyebrow rise flex items-center gap-2 text-paper/55">
            <span className="inline-block size-1.5 rotate-45 bg-volt" /> Brand intelligence &amp; identity workspace
          </p>
          <h1 id="hero-title" className="mt-6 text-[length:var(--text-giant)] leading-[0.92] font-semibold tracking-[-0.045em]">
            <span className="rise block" style={{ ["--i" as string]: 1 }}>
              Your idea
            </span>
            <span className="rise block" style={{ ["--i" as string]: 2 }}>
              deserves <span className="serif-em relative inline-block pr-[0.06em] text-volt">more</span>
            </span>
            <span className="rise block" style={{ ["--i" as string]: 3 }}>
              than a logo.
            </span>
          </h1>
          <p className="rise mt-8 max-w-xl text-[17px] leading-relaxed text-paper/70 sm:text-lg" style={{ ["--i" as string]: 5 }}>
            BrandFoundry transforms raw business ideas into strategically positioned brands, complete visual identities, and consistent brand systems — all in one intelligent workspace.
          </p>
          <div className="rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ ["--i" as string]: 6 }}>
            <Link to="/projects/new" className="btn btn-lg btn-volt group">
              Build Your Brand <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/demo" className="btn btn-lg btn-line text-paper">
              Explore a Demo
            </Link>
          </div>
          <p className="rise mt-8 flex items-center gap-3 font-mono text-[12px] text-paper/45" style={{ ["--i" as string]: 7 }}>
            <span className="h-px w-8 bg-paper/30" /> From first thought to finished brand system.
          </p>
        </div>
        <div className="rise lg:col-span-5 lg:pt-4" style={{ ["--i" as string]: 4 }}>
          <FoundryPreview />
        </div>
      </div>
    </section>
  );
}

const FLOW = ["Discover", "Research", "Position", "Shape", "Visualize", "Challenge", "Validate", "Publish"];

function WorkflowBand() {
  return (
    <div className="border-y border-paper/10 bg-ink" aria-label="BrandFoundry workflow">
      <ol className="scrollbar-none mx-auto flex max-w-[1440px] items-center gap-5 overflow-x-auto px-4 py-4 sm:px-8 lg:justify-between">
        {FLOW.map((s, i) => (
          <li key={s} className="flex shrink-0 items-center gap-5 font-mono text-[11px] tracking-[0.16em] text-paper/55 uppercase">
            <span>
              <span className="text-paper/30">{String(i + 1).padStart(2, "0")}</span> {s}
            </span>
            {i < FLOW.length - 1 && <span className="inline-block size-1 rotate-45 bg-paper/30" aria-hidden />}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ───────────────────────── What we do + capabilities ───────────────────────── */

const CAPS = [
  { key: "discover", name: "Discover", body: "Turn a rough business idea into a structured brand brief. Define the audience, customer problem, mission, values, and business context." },
  { key: "research", name: "Research", body: "Explore competitors, market positioning, messaging patterns, and potential opportunities using available evidence and clearly labeled hypotheses." },
  { key: "position", name: "Position", body: "Develop strategic directions, value propositions, differentiators, brand promises, and messaging pillars." },
  { key: "shape", name: "Shape", body: "Build brand personality, tone of voice, naming directions, taglines, and communication guidelines." },
  { key: "visualize", name: "Visualize", body: "Create and refine visual identity concepts, colors, typography, logo directions, and real-world brand applications." },
  { key: "validate", name: "Validate", body: "Challenge assumptions, identify contradictions, and check whether the visual identity and messaging align with the approved strategy." },
] as const;

function WhatWeDo() {
  const [active, setActive] = useState(0);
  return (
    <section id="what" className="on-light scroll-mt-16 bg-paper text-ink" aria-labelledby="what-title">
      <div className="mx-auto max-w-[1440px] px-4 pt-20 pb-10 sm:px-8 sm:pt-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <p className="eyebrow reveal text-stone-dark lg:col-span-3">What we do</p>
          <div className="lg:col-span-9">
            <h2 id="what-title" className="reveal text-[length:var(--text-huge)] leading-[0.98] font-semibold tracking-[-0.04em]">
              Everything behind a brand. <span className="serif-em">Finally, connected.</span>
            </h2>
            <div className="reveal mt-8 grid gap-6 text-[17px] leading-relaxed text-ink/70 sm:grid-cols-2" style={{ ["--i" as string]: 1 }}>
              <p>Most tools hand you a logo and stop. A logo without a strategy is decoration: it can't tell you who it is for, what it promises, or why it should look the way it does.</p>
              <p>BrandFoundry connects strategy, research, messaging, identity and validation in one workflow. Every approved decision becomes an input to the next stage, so the finished brand holds together.</p>
            </div>
          </div>
        </div>
      </div>

      <div id="capabilities" className="mx-auto max-w-[1440px] scroll-mt-16 px-4 pb-24 sm:px-8 sm:pb-32">
        <div className="grid gap-10 border-t border-ink/15 pt-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-6 text-stone-dark">Six capabilities, one system</p>
            <ol className="border-t border-ink/15">
              {CAPS.map((c, i) => {
                const on = active === i;
                return (
                  <li key={c.key} className="border-b border-ink/15">
                    <button
                      onClick={() => setActive(i)}
                      onMouseEnter={() => window.matchMedia("(min-width: 1024px)").matches && setActive(i)}
                      aria-expanded={on}
                      aria-controls={`cap-${c.key}`}
                      className="group flex w-full items-baseline gap-5 py-5 text-left"
                    >
                      <span className={cx("w-6 font-mono text-[11px] transition", on ? "text-ink" : "text-stone-dark")}>{String(i + 1).padStart(2, "0")}</span>
                      <span className={cx("flex-1 font-display text-[clamp(1.75rem,3vw,2.6rem)] leading-none font-semibold tracking-[-0.035em] transition", on ? "text-ink" : "text-ink/35 group-hover:text-ink/70")}>{c.name}</span>
                      <span className={cx("inline-block size-2.5 rotate-45 transition", on ? "bg-ink" : "bg-transparent")} aria-hidden />
                    </button>
                    <div className={cx("grid transition-[grid-template-rows] duration-500", on ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <div className="overflow-hidden">
                        <p className="max-w-md pb-6 pl-11 text-[15px] leading-relaxed text-ink/70">{c.body}</p>
                        <div className="pb-6 lg:hidden">
                          <CapabilityPreview k={c.key} />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="hidden lg:col-span-7 lg:block">
            <div className="sticky top-24">
              <div id={`cap-${CAPS[active].key}`} className="cropmarks text-ink">
                <div key={active} className="fade-in min-h-[520px] rounded-[3px] bg-sheet p-8 shadow-[0_1px_0_rgb(0_0_0/0.04),0_30px_60px_-40px_rgb(0_0_0/0.35)] ring-1 ring-ink/10">
                  <CapabilityPreview k={CAPS[active].key} />
                </div>
              </div>
              <p className="mt-4 font-mono text-[10px] tracking-wider text-stone-dark uppercase">Preview built from the KORA sample project · fictional</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewHead({ stage, title, tag }: { stage: string; title: string; tag?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
      <div>
        <p className="eyebrow text-stone-dark">{stage}</p>
        <p className="mt-1 font-display text-xl font-semibold tracking-tight">{title}</p>
      </div>
      {tag}
    </div>
  );
}

const rubric = evaluate({ brief: demoBrief, positioning: demoPositioning, voice: demoVoice, naming: demoNaming, identity: demoIdentity, summaries: [] });

function CapabilityPreview({ k }: { k: (typeof CAPS)[number]["key"] }) {
  const d = demoDirections[0];
  switch (k) {
    case "discover":
      return (
        <div>
          <PreviewHead stage="01 · Brand brief" title={`${DEMO_NAME} — brief`} tag={<span className="chip text-ink/60">v3 · approved</span>} />
          <dl className="grid gap-x-8 gap-y-5 text-[14px] sm:grid-cols-2">
            {(
              [
                ["Audience", demoBrief.audience],
                ["Problem", demoBrief.problem],
                ["Mission", demoBrief.mission],
                ["Market", demoBrief.market],
              ] as const
            ).map(([dt, dd]) => (
              <div key={dt}>
                <dt className="eyebrow mb-1 text-stone-dark">{dt}</dt>
                <dd className="leading-relaxed">{dd}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-l-2 border-amber bg-paper px-4 py-3 text-[13px]">
            <p className="eyebrow mb-1 text-[#8a6a10]">Assumption · unverified</p>
            {demoBrief.assumptions[0].text}
          </div>
        </div>
      );
    case "research":
      return (
        <div>
          <PreviewHead stage="02 · Competitors" title="Positioning map" tag={<span className="chip text-ink/60">Your evidence only</span>} />
          <div className="grid grid-cols-[110px_1fr_1fr_1fr] text-[13px]">
            {["", "Archetype A", "Archetype B", DEMO_NAME].map((h, i) => (
              <div key={i} className={cx("border-b border-ink/15 pb-2 font-semibold", i === 3 && "text-ink")}>
                {h}
              </div>
            ))}
            {[
              ["Promise", "Lowest price", "Global cachet", "Traceable craft"],
              ["Voice", "Promotional", "Exclusive", "Direct, proud"],
              ["Visual", "Loud banners", "Big logos", "Raw, typographic"],
            ].map((row) =>
              row.map((cell, i) => (
                <div key={row[0] + i} className={cx("border-b border-ink/10 py-3 pr-3", i === 0 ? "text-stone-dark" : "", i === 3 && "bg-volt/40 pl-2 font-medium")}>
                  {cell}
                </div>
              )),
            )}
          </div>
          <div className="mt-6 flex items-start gap-3 text-[13px]">
            <span className="chip shrink-0 border-ink/30">Hypothesis</span>
            <p className="leading-relaxed text-ink/75">No one in this set names the people who make the clothes. Traceability could be an ownable space. Verify before you rely on it.</p>
          </div>
        </div>
      );
    case "position":
      return (
        <div>
          <PreviewHead stage="03 · Positioning" title="Three directions, one choice" />
          <div className="space-y-2">
            {demoPositioning.directions.map((dir, i) => (
              <div key={dir.id} className={cx("grid grid-cols-[28px_1fr] gap-3 rounded-[3px] p-4 ring-1", i === 0 ? "bg-ink text-paper ring-ink" : "ring-ink/10")}>
                <span className="font-mono text-[12px] opacity-60">{String.fromCharCode(65 + i)}</span>
                <div>
                  <p className="text-[14px] font-semibold">{dir.title}</p>
                  <p className={cx("mt-1 font-serif text-[16px] leading-snug italic", i === 0 ? "text-paper/85" : "text-ink/60")}>{dir.statement}</p>
                  {i === 0 && <p className="mt-3 font-mono text-[10px] tracking-wider text-volt uppercase">Selected · trade-off: {dir.tradeoffs[0]}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "shape":
      return (
        <div>
          <PreviewHead stage="04 · Voice & naming" title={`Chosen name: ${demoNaming.chosen}`} tag={<span className="chip text-ink/60">Not trademark-checked</span>} />
          <div className="space-y-4">
            {SLIDERS.map((s) => (
              <div key={s.key} className="grid grid-cols-[100px_1fr_100px] items-center gap-3 text-[12px]">
                <span className="text-right text-ink/60">{s.left}</span>
                <div className="relative h-px bg-ink/30">
                  <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-ink bg-volt" style={{ left: `${demoVoice.sliders[s.key]}%` }} />
                </div>
                <span className="text-ink/60">{s.right}</span>
              </div>
            ))}
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="eyebrow mb-2 text-stone-dark">Taglines</p>
              {demoVoice.taglines.map((t) => (
                <p key={t} className="font-display text-lg leading-snug font-semibold">
                  {t}
                </p>
              ))}
            </div>
            <div className="bg-paper p-4 text-[13px]">
              <p className="eyebrow mb-2 text-stone-dark">Voice check</p>
              <p>
                “Our <mark className="bg-signal/25 px-0.5">premium</mark>, <mark className="bg-signal/25 px-0.5">eco-friendly</mark> tees”
              </p>
              <p className="mt-2 text-ink/60">Two words from the avoid list. Show, don't claim.</p>
            </div>
          </div>
        </div>
      );
    case "visualize":
      return (
        <div>
          <PreviewHead stage="05 · Identity studio" title={d.name} tag={<span className="chip text-ink/60">Editable system</span>} />
          <div className="grid gap-px overflow-hidden rounded-[3px] bg-ink/10 sm:grid-cols-[1.4fr_1fr]">
            <div className="grid h-56 place-items-center p-8" style={{ background: d.palette.paper }}>
              <Logo d={d} name={DEMO_NAME} className="w-full [&>svg]:max-h-24" />
            </div>
            <div className="grid h-56 place-items-center p-8" style={{ background: d.palette.ink }}>
              <Logo d={d} name={DEMO_NAME} variant="mark-reversed" className="size-24" />
            </div>
          </div>
          <PaletteStrip d={d} className="mt-4 h-24" />
          <p className="mt-4 text-[13px] text-ink/60">
            {FONTS[d.typography.display].family} for display, {FONTS[d.typography.text].family} for text. Motif: {d.motif}.
          </p>
        </div>
      );
    case "validate":
      return (
        <div>
          <PreviewHead stage="06–07 · Challenge & validate" title="What could break this brand?" tag={<span className="font-mono text-[12px]">{rubric.passed} of {rubric.total} rules pass</span>} />
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            {demoChallenge.findings.map((f) => (
              <li key={f.id} className="grid grid-cols-[14px_1fr_auto] items-start gap-3 py-3.5">
                <span className={cx("mt-1.5 inline-block size-2 rotate-45", f.severity === "high" ? "bg-signal" : "bg-amber")} />
                <div>
                  <p className="text-[14px] font-medium">{f.title}</p>
                  <p className="mt-0.5 text-[12px] text-stone-dark capitalize">
                    {f.perspective} · {f.severity}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink/70">→ {f.action}</p>
                </div>
                <span className="chip text-ink/60">{f.basis}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] leading-relaxed text-ink/60">Every finding names the artifact it affects, the reasoning behind it, and a concrete next action.</p>
        </div>
      );
  }
}

/* ───────────────────────── Transformation ───────────────────────── */

function Transformation() {
  const [mode, setMode] = useState<"concept" | "brand">("brand");
  const d = demoDirections[0];
  const final = demoPositioning.final!;
  return (
    <section id="transformation" className="relative overflow-hidden bg-ink" aria-labelledby="tx-title">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8 sm:py-32">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <h2 id="tx-title" className="reveal max-w-4xl text-[length:var(--text-huge)] leading-[0.98] font-semibold tracking-[-0.04em]">
            From a rough idea to a brand <span className="serif-em text-paper/80">with a point of view.</span>
          </h2>
          <div className="reveal shrink-0">
            <Segmented
              dark
              label="Compare"
              value={mode}
              onChange={setMode}
              options={[
                { value: "concept", label: "Initial concept" },
                { value: "brand", label: "Developed brand" },
              ]}
            />
          </div>
        </div>

        <div className="reveal mt-14 min-h-[560px]">
          {mode === "concept" ? (
            <div key="c" className="fade-in grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-6 lg:col-start-2">
                <div className="-rotate-1 bg-paper p-8 text-ink shadow-[0_40px_80px_-40px_rgb(0_0_0/0.8)] sm:p-12">
                  <p className="eyebrow text-stone-dark">Business idea</p>
                  <p className="mt-5 font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] italic">A sustainable streetwear label for young Indian consumers.</p>
                  <div className="mt-8 space-y-2 border-t border-dashed border-ink/25 pt-5 font-mono text-[12px] text-ink/55">
                    <p>— who exactly? all young people?</p>
                    <p>— “sustainable” how? everyone says that</p>
                    <p>— name? logo? colours? no idea yet</p>
                  </div>
                </div>
              </div>
              <ul className="space-y-4 text-[15px] text-paper/60 lg:col-span-4">
                {["No defined audience", "No reason to choose it over anything else", "No voice, no name, no identity", "Nothing to brief a designer with"].map((t, i) => (
                  <li key={t} className="rise flex items-center gap-4" style={{ ["--i" as string]: i }}>
                    <span className="h-px w-6 bg-paper/30" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div key="b" className="fade-in grid gap-px overflow-hidden rounded-[3px] bg-paper/10 ring-1 ring-paper/10 md:grid-cols-2 lg:grid-cols-12">
              <Panel n="01" label="Target audience" className="lg:col-span-4">
                <p className="text-[18px] leading-snug">{final.audience}</p>
              </Panel>
              <Panel n="02" label="Positioning" className="lg:col-span-8">
                <p className="font-serif text-[clamp(1.4rem,2.4vw,2rem)] leading-[1.2] italic">“{final.statement}”</p>
              </Panel>
              <Panel n="03" label="Personality & voice" className="lg:col-span-5">
                <div className="flex flex-wrap gap-1.5">
                  {demoBrief.personality.map((p) => (
                    <span key={p} className="chip border-paper/25 text-paper/80">
                      {p}
                    </span>
                  ))}
                </div>
                <p className="mt-5 font-display text-2xl font-semibold tracking-tight">{demoVoice.taglines[0]}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-paper/55">{demoVoice.principles[0].name}: {demoVoice.principles[0].description}</p>
              </Panel>
              <Panel n="04" label="Visual identity" className="lg:col-span-7" flush>
                <div className="grid h-full grid-cols-[1.5fr_1fr]">
                  <div className="grid place-items-center p-8" style={{ background: d.palette.paper }}>
                    <Logo d={d} name={DEMO_NAME} className="w-full [&>svg]:max-h-20" />
                  </div>
                  <div className="flex flex-col">
                    {Object.values(d.palette).map((c, i) => (
                      <span key={i} className="flex-1" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </Panel>
              <Panel n="05" label="Brand kit" className="md:col-span-2 lg:col-span-12">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[12px] text-paper/70">
                  {["Guidelines PDF", "Strategy Markdown", "Design tokens JSON", "CSS variables", "SVG logo set", "PNG previews"].map((f) => (
                    <span key={f} className="flex items-center gap-2">
                      <span className="inline-block size-1.5 rotate-45 bg-volt" /> {f}
                    </span>
                  ))}
                </div>
              </Panel>
            </div>
          )}
        </div>
        <p className="mt-6 max-w-2xl text-[12px] leading-relaxed text-paper/40">KORA is a fictional brand created to demonstrate the workflow. No market research, sales data or customer feedback is implied.</p>
      </div>
    </section>
  );
}

function Panel({ n, label, children, className, flush }: { n: string; label: string; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <div className={cx("flex flex-col bg-ink-2", className)}>
      <div className="flex items-center gap-3 px-6 pt-5 pb-4 font-mono text-[10px] tracking-[0.16em] text-paper/45 uppercase">
        <span className="text-volt">{n}</span> {label}
      </div>
      <div className={cx("flex-1", !flush && "px-6 pb-7")}>{children}</div>
    </div>
  );
}

/* ───────────────────────── How it works ───────────────────────── */

const STEPS = [
  { t: "Bring your idea.", d: "Describe your business, product, audience, and ambitions.", out: "Brand brief" },
  { t: "Find your direction.", d: "Develop your positioning, brand personality, and creative direction.", out: "Positioning · voice" },
  { t: "Build your identity.", d: "Explore names, visual concepts, messaging, and design tokens.", out: "Name · identity system" },
  { t: "Challenge and refine.", d: "Identify inconsistencies, question assumptions, and refine the system.", out: "Critique · consistency report" },
  { t: "Export your brand kit.", d: "Collect the approved identity, messaging, colors, typography, and guidelines in a reusable package.", out: "PDF · MD · JSON · CSS · SVG" },
];

function HowItWorks() {
  return (
    <section id="how" className="on-light scroll-mt-16 bg-paper text-ink" aria-labelledby="how-title">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-8 lg:grid-cols-12">
          <p className="eyebrow reveal text-stone-dark lg:col-span-3">How it works</p>
          <div className="lg:col-span-9">
            <h2 id="how-title" className="reveal text-[length:var(--text-huge)] leading-[0.98] font-semibold tracking-[-0.04em]">
              Five moves. <span className="serif-em">Every one leaves an artifact.</span>
            </h2>
            <p className="reveal mt-6 max-w-2xl text-[17px] leading-relaxed text-ink/70" style={{ ["--i" as string]: 1 }}>
              Each step produces something you can edit, approve, version, or regenerate. When you change an approved decision, everything built on it is flagged for review instead of being silently rewritten.
            </p>
          </div>
        </div>

        <ol className="relative mt-16 grid gap-0 lg:grid-cols-5 lg:gap-6">
          <span className="absolute top-[34px] right-0 left-0 hidden h-px bg-ink/20 lg:block" aria-hidden />
          <span className="absolute top-0 bottom-0 left-[17px] w-px bg-ink/20 lg:hidden" aria-hidden />
          {STEPS.map((s, i) => (
            <li key={s.t} className="reveal relative grid grid-cols-[36px_1fr] gap-5 pb-10 lg:block lg:pb-0" style={{ ["--i" as string]: i }}>
              <span className={cx("relative z-10 grid size-9 place-items-center rounded-full font-mono text-[11px] ring-1", i === 4 ? "bg-volt ring-ink" : "bg-paper ring-ink/30")}>{String(i + 1).padStart(2, "0")}</span>
              <div className="lg:mt-8">
                <h3 className="text-[22px] leading-tight font-semibold tracking-tight">{s.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink/65">{s.d}</p>
                <p className="mt-5 inline-flex items-center gap-2 border-t border-ink/15 pt-3 font-mono text-[11px] text-ink/55">
                  <ArrowRight size={12} /> {s.out}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────────────────── Studio ───────────────────────── */

function Studio() {
  return (
    <section id="studio" className="scroll-mt-16 bg-ink" aria-labelledby="studio-title">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8 sm:py-32">
        <div className="mb-12 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow reveal flex items-center gap-2 text-paper/50">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-volt" style={{ animation: "pulse-dot 2s infinite" }} />
              </span>
              Brand Studio · live
            </p>
            <h2 id="studio-title" className="reveal mt-5 text-[length:var(--text-huge)] leading-[0.98] font-semibold tracking-[-0.04em]">
              Change a colour. <span className="serif-em text-paper/80">Watch the brand follow.</span>
            </h2>
          </div>
          <p className="reveal self-end text-[16px] leading-relaxed text-paper/60 lg:col-span-5" style={{ ["--i" as string]: 1 }}>
            This is the identity canvas from the workspace, running on the sample brand. Switch directions, recolour the palette or swap the typeface. The logo, website, social post and merchandise all redraw from the same tokens.
          </p>
        </div>
        <div className="reveal">
          <StudioDemo />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Differentiators ───────────────────────── */

const DIFFS = [
  { t: "Strategy before aesthetics", d: "Visual decisions are informed by the brand brief, positioning, audience, and personality." },
  { t: "One connected workflow", d: "Approved decisions feed into subsequent stages instead of creating disconnected AI outputs." },
  { t: "Built-in critical thinking", d: "BrandFoundry can challenge assumptions, identify contradictions, and explain why an identity may not align with its strategy." },
];

/** Each advantage is shown with the actual UI element that delivers it. */
function Proof({ i }: { i: number }) {
  if (i === 0)
    return (
      <div className="rounded-[3px] bg-sheet p-4 font-mono text-[11px] leading-relaxed text-ink/70 ring-1 ring-ink/10">
        <p className="text-ink">Visual identity · v4</p>
        <p>Built from Positioning v3, Voice v2, Naming v1</p>
      </div>
    );
  if (i === 1)
    return (
      <div className="border-l-2 border-signal bg-sheet p-4 text-[13px] ring-1 ring-ink/10">
        <p className="font-semibold">Needs review: Positioning changed (v4).</p>
        <p className="mt-1 text-ink/60">Nothing has been changed automatically.</p>
      </div>
    );
  return (
    <div className="rounded-[3px] bg-sheet p-4 text-[13px] ring-1 ring-ink/10">
      <div className="flex items-center gap-2">
        <span className="inline-block size-2 rotate-45 bg-amber" />
        <span className="font-semibold">“Raw” may read as unfinished</span>
      </div>
      <div className="mt-2 flex gap-2">
        <span className="chip !py-0.5 border-dashed text-ink/60">Judgment</span>
        <span className="chip !py-0.5 text-ink/60">Customer</span>
      </div>
    </div>
  );
}

function Differentiators() {
  return (
    <section className="on-light bg-paper text-ink" aria-labelledby="diff-title">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8 sm:py-32">
        <h2 id="diff-title" className="reveal max-w-5xl text-[length:var(--text-giant)] leading-[0.92] font-semibold tracking-[-0.045em]">
          Not another <span className="serif-em">AI logo</span> generator.
        </h2>
        <div className="mt-16 grid border-t border-ink lg:grid-cols-3">
          {DIFFS.map((x, i) => (
            <div key={x.t} className={cx("reveal flex flex-col border-b border-ink/15 py-8 lg:border-b-0 lg:px-8 lg:py-10", i > 0 && "lg:border-l lg:border-ink/15", i === 0 && "lg:pl-0")} style={{ ["--i" as string]: i }}>
              <span className="font-mono text-[11px] text-stone-dark">0{i + 1}</span>
              <h3 className="mt-3 text-[28px] leading-tight font-semibold tracking-tight">{x.t}</h3>
              <p className="mt-4 mb-8 max-w-sm text-[16px] leading-relaxed text-ink/65">{x.d}</p>
              <div className="mt-auto">
                <Proof i={i} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Final CTA + footer ───────────────────────── */

function FinalCta() {
  return (
    <section className="on-light relative overflow-hidden bg-volt text-ink" aria-labelledby="cta-title">
      <div className="relative mx-auto max-w-[1440px] px-4 py-24 sm:px-8 sm:py-32">
        <h2 id="cta-title" className="reveal max-w-5xl text-[length:var(--text-giant)] leading-[0.92] font-semibold tracking-[-0.045em]">
          Stop collecting ideas. <br className="hidden sm:block" />
          Start building your brand.
        </h2>
        <p className="reveal mt-8 max-w-xl text-lg leading-relaxed text-ink/75" style={{ ["--i" as string]: 1 }}>
          Bring your idea, find your direction, and turn it into a coherent brand system.
        </p>
        <div className="reveal mt-10 flex flex-col gap-3 sm:flex-row" style={{ ["--i" as string]: 2 }}>
          <Link to="/projects/new" className="btn btn-lg btn-ink group">
            Build Your Brand <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
          </Link>
          <Link to="/demo" className="btn btn-lg btn-line">
            Explore the Demo
          </Link>
        </div>
        <p className="reveal mt-8 text-[13px] text-ink/60" style={{ ["--i" as string]: 3 }}>
          No account needed to start. Create one when you want to keep your work.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  const col = (title: string, links: { to: string; label: string; anchor?: boolean }[]) => (
    <div>
      <p className="eyebrow mb-4 text-paper/40">{title}</p>
      <ul className="space-y-2.5 text-[14px]">
        {links.map((l) => (
          <li key={l.label}>
            {l.anchor ? (
              <a href={l.to} className="text-paper/70 transition hover:text-paper">
                {l.label}
              </a>
            ) : (
              <Link to={l.to} className="text-paper/70 transition hover:text-paper">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 pt-20 pb-10 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Wordmark size={26} />
          <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-paper/55">A brand intelligence and identity workspace. Strategy, voice, naming, identity and validation in one connected workflow.</p>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:col-span-8">
          {col("Product", [
            { to: "#what", label: "What we do", anchor: true },
            { to: "#capabilities", label: "Capabilities", anchor: true },
            { to: "#transformation", label: "Sample transformation", anchor: true },
          ])}
          {col("Workflow", [
            { to: "#how", label: "How it works", anchor: true },
            { to: "#studio", label: "Brand Studio", anchor: true },
            { to: "/demo", label: "Demo workspace" },
          ])}
          {col("Start", [
            { to: "/projects/new", label: "Build your brand" },
            { to: "/dashboard", label: "Your projects" },
            { to: "/auth", label: "Sign in" },
          ])}
          {col("Legal", [
            { to: "/privacy", label: "Privacy policy" },
            { to: "/terms", label: "Terms of service" },
          ])}
        </div>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 border-t border-paper/10 px-4 py-6 font-mono text-[11px] text-paper/40 sm:flex-row sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} BrandFoundry</span>
        <span>KORA is a fictional demonstration brand</span>
      </div>
    </footer>
  );
}
