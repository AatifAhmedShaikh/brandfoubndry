import type { CSSProperties } from "react";
import type { IdentityDirection } from "@shared/schemas";
import { FONTS, casedName, contrast, fontStack, logoSvg, motifCss, onColor } from "@shared/identity";
import { useFonts } from "@/lib/hooks";
import { cx } from "./ui";

export type Copy = { tagline: string; headline: string; subhead: string; cta: string };
export type CanvasView = "logo" | "web" | "social" | "merch" | "type";
export type Surface = "light" | "dark";

/** Renders the same SVG string that the export pipeline writes, so preview and file match. */
export function Logo({ d, name, variant = "primary", className, title }: { d: IdentityDirection; name: string; variant?: "primary" | "mark" | "reversed" | "mark-reversed"; className?: string; title?: string }) {
  useFonts([d.typography.display]);
  return <div role="img" aria-label={title ?? `${name} ${variant} logo`} className={cx("[&>svg]:block [&>svg]:h-full [&>svg]:w-full", className)} dangerouslySetInnerHTML={{ __html: logoSvg(d, name, variant).replace(/role="img" aria-label="[^"]*"/, 'aria-hidden="true"') }} />;
}

export function PaletteStrip({ d, className, labels = true }: { d: IdentityDirection; className?: string; labels?: boolean }) {
  return (
    <div className={cx("grid grid-cols-5", className)}>
      {(Object.entries(d.palette) as [string, string][]).map(([k, hex]) => (
        <div key={k} className="min-w-0">
          <div className="h-full min-h-10 shadow-[inset_0_0_0_1px_rgb(128_128_128/0.22)]" style={{ background: hex }} />
          {labels && (
            <div className="pt-2 pr-1">
              <p className="eyebrow truncate !text-[10px] opacity-60">{k}</p>
              <p className="font-mono text-[11px]">{hex.toUpperCase()}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const surfaceOf = (d: IdentityDirection, s: Surface) => (s === "dark" ? { bg: d.palette.ink, fg: d.palette.paper } : { bg: d.palette.paper, fg: d.palette.ink });

/** The large preview in the identity studio and the landing page demo. */
export function IdentityCanvas({ d, name, copy, view, surface, className }: { d: IdentityDirection; name: string; copy: Copy; view: CanvasView; surface: Surface; className?: string }) {
  useFonts([d.typography.display, d.typography.text]);
  const { bg, fg } = surfaceOf(d, surface);
  const display: CSSProperties = { fontFamily: fontStack(d.typography.display) };
  const text: CSSProperties = { fontFamily: fontStack(d.typography.text) };
  const onPrimary = onColor(d.palette.primary, d.palette.ink, d.palette.paper);

  return (
    <div className={cx("relative h-full w-full overflow-hidden transition-colors duration-500", className)} style={{ background: bg, color: fg }}>
      {view === "logo" && (
        <div key="logo" className="fade-in grid h-full grid-rows-[1fr_auto]">
          <div className="grid place-items-center p-8 sm:p-14">
            <Logo d={d} name={name} variant={surface === "dark" ? "reversed" : "primary"} className="w-full max-w-[520px] [&>svg]:max-h-48" />
          </div>
          <div className="grid grid-cols-3 border-t" style={{ borderColor: `${fg}22` }}>
            {(["mark", "primary", "reversed"] as const).map((v, i) => (
              <div key={v} className="flex flex-col items-center gap-3 p-4" style={{ borderLeft: i ? `1px solid ${fg}22` : undefined, background: v === "reversed" ? d.palette.ink : undefined }}>
                <Logo d={d} name={name} variant={v === "mark" && surface === "dark" ? "mark-reversed" : v} className={cx("h-10", v === "mark" ? "w-10" : "w-full max-w-36")} />
                <span className="eyebrow !text-[9px]" style={{ color: v === "reversed" ? d.palette.paper : fg, opacity: 0.55 }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "web" && (
        <div key="web" className="fade-in flex h-full flex-col">
          <div className="flex items-center gap-1.5 border-b px-3 py-2" style={{ borderColor: `${fg}18` }}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2 rounded-full" style={{ background: `${fg}30` }} />
            ))}
            <span className="ml-3 truncate rounded-[2px] px-2 py-0.5 font-mono text-[10px]" style={{ background: `${fg}10` }}>
              {name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-4 sm:px-8">
            <Logo d={d} name={name} variant={surface === "dark" ? "reversed" : "primary"} className="h-6 w-28 [&>svg]:object-left" />
            <div className="hidden gap-5 text-[12px] opacity-70 sm:flex" style={text}>
              <span>Shop</span>
              <span>Story</span>
              <span>Makers</span>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-1 sm:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col justify-center gap-4 px-5 pb-8 sm:px-8">
              <h3 className="text-[clamp(1.6rem,3.4vw,2.9rem)] leading-[0.98] font-bold" style={{ ...display, letterSpacing: "-0.03em" }}>
                {copy.headline || copy.tagline || `${name}, made clear.`}
              </h3>
              <p className="max-w-sm text-[13px] leading-relaxed opacity-75" style={text}>
                {copy.subhead || "Your supporting line appears here once voice guidelines are written."}
              </p>
              <span className="mt-1 inline-flex w-fit px-4 py-2 text-[13px] font-semibold" style={{ ...text, background: d.palette.primary === bg ? d.palette.accent : d.palette.primary, color: d.palette.primary === bg ? onColor(d.palette.accent) : onPrimary }}>
                {copy.cta || "Explore"} →
              </span>
            </div>
            <div className="relative hidden min-h-40 sm:block" style={{ background: d.palette.secondary }}>
              <div className="absolute inset-0" style={{ backgroundImage: motifCss(d.motif, onColor(d.palette.secondary, d.palette.ink, d.palette.paper), 0.35) }} />
              <div className="absolute right-6 bottom-6 size-16" style={{ background: d.palette.accent }} />
            </div>
          </div>
        </div>
      )}

      {view === "social" && (
        <div key="social" className="fade-in grid h-full place-items-center p-6 sm:p-10">
          <div className="relative aspect-square w-full max-w-[400px] overflow-hidden shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]" style={{ background: d.palette.primary, color: onPrimary }}>
            <div className="absolute inset-0" style={{ backgroundImage: motifCss(d.motif, onPrimary, 0.22) }} />
            <div className="absolute inset-0 flex flex-col justify-between p-[8%]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest uppercase opacity-70">{casedName(name, "upper")}</span>
                <span className="size-3" style={{ background: d.palette.accent }} />
              </div>
              <p className="text-[clamp(1.4rem,4.2vw,2.4rem)] leading-[1.02] font-bold" style={{ ...display, letterSpacing: "-0.03em" }}>
                {copy.tagline || copy.headline || name}
              </p>
            </div>
          </div>
        </div>
      )}

      {view === "merch" && (
        <div key="merch" className="fade-in grid h-full grid-cols-[1.3fr_1fr] items-center gap-4 p-6 sm:p-10">
          <svg viewBox="0 0 300 320" className="w-full drop-shadow-[0_24px_30px_rgb(0_0_0/0.25)]" aria-label={`${name} tee mockup`}>
            <path d="M98 22 L58 34 L8 74 L36 120 L66 104 L66 304 L234 304 L234 104 L264 120 L292 74 L242 34 L202 22 Q150 58 98 22 Z" fill={surface === "dark" ? d.palette.paper : d.palette.ink} />
            <path d="M98 22 Q150 58 202 22" fill="none" stroke={surface === "dark" ? d.palette.ink : d.palette.paper} strokeOpacity=".25" strokeWidth="3" />
            <foreignObject x="104" y="86" width="92" height="40">
              <Logo d={d} name={name} variant={surface === "dark" ? "primary" : "reversed"} className="h-10 w-[92px] [&>svg]:max-h-10" />
            </foreignObject>
          </svg>
          <div className="relative mx-auto w-full max-w-[150px] rotate-[4deg] p-4 pt-8 shadow-xl" style={{ background: d.palette.paper, color: d.palette.ink }}>
            <span className="absolute top-3 left-1/2 size-2.5 -translate-x-1/2 rounded-full" style={{ background: bg, boxShadow: `inset 0 0 0 1px ${d.palette.ink}33` }} />
            <Logo d={d} name={name} variant="mark" className="mx-auto mb-3 size-12" />
            <p className="text-center text-[11px] leading-tight font-semibold" style={display}>
              {copy.tagline || name}
            </p>
            <div className="mt-3 h-1.5" style={{ background: d.palette.accent }} />
          </div>
        </div>
      )}

      {view === "type" && <TypeSpecimen key="type" d={d} name={name} fg={fg} />}

    </div>
  );
}

export function TypeSpecimen({ d, name, fg }: { d: IdentityDirection; name: string; fg: string }) {
  const disp = FONTS[d.typography.display];
  const txt = FONTS[d.typography.text];
  return (
    <div className="fade-in grid h-full grid-cols-1 sm:grid-cols-[1fr_1fr]">
      <div className="flex flex-col justify-between p-6 sm:p-10">
        <span className="eyebrow opacity-60">Display · {disp.family}</span>
        <p className="text-[clamp(5rem,14vw,10rem)] leading-[0.85] font-bold" style={{ fontFamily: fontStack(d.typography.display), letterSpacing: "-0.04em" }}>
          Aa
        </p>
        <p className="text-2xl font-semibold" style={{ fontFamily: fontStack(d.typography.display) }}>
          {casedName(name, d.wordmark.case)} — {disp.note}
        </p>
      </div>
      <div className="flex flex-col justify-between gap-6 border-t p-6 sm:border-t-0 sm:border-l sm:p-10" style={{ borderColor: `${fg}22` }}>
        <span className="eyebrow opacity-60">Text · {txt.family}</span>
        <p className="text-[15px] leading-relaxed" style={{ fontFamily: fontStack(d.typography.text) }}>
          ABCDEFGHIJKLMNOPQRSTUVWXYZ
          <br />
          abcdefghijklmnopqrstuvwxyz 0123456789
          <br />
          <br />
          {d.imageDirection || "Body copy is set in the text face for long reading at small sizes."}
        </p>
        <div className="flex items-center gap-3 font-mono text-[11px] opacity-70">
          <span>ink/paper {contrast(d.palette.ink, d.palette.paper).toFixed(1)}:1</span>
          <span>·</span>
          <span>{txt.note}</span>
        </div>
      </div>
    </div>
  );
}
