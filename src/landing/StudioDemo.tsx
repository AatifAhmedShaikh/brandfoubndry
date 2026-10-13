import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Moon, RotateCcw, Sun } from "lucide-react";
import type { FontKey, IdentityDirection } from "@shared/schemas";
import { demoDirections, demoPositioning, demoVoice, DEMO_NAME } from "@shared/demo";
import { FONTS } from "@shared/identity";
import { IdentityCanvas, type CanvasView, type Surface } from "@/components/identity";
import { Segmented, cx } from "@/components/ui";

const VIEWS: { value: CanvasView; label: string }[] = [
  { value: "logo", label: "Logo" },
  { value: "web", label: "Website" },
  { value: "social", label: "Social" },
  { value: "merch", label: "Merch" },
  { value: "type", label: "Type" },
];
const DISPLAY_FONTS: FontKey[] = ["space-grotesk", "fraunces", "syne", "playfair", "bricolage"];

/** The landing page's live studio: the same canvas the workspace uses, on sample data. */
export function StudioDemo() {
  const [dirs, setDirs] = useState<IdentityDirection[]>(demoDirections);
  const [active, setActive] = useState(0);
  const [view, setView] = useState<CanvasView>("web");
  const [surface, setSurface] = useState<Surface>("light");
  const d = dirs[active];
  const patch = (p: Partial<IdentityDirection>) => setDirs((all) => all.map((x, i) => (i === active ? { ...x, ...p } : x)));

  return (
    <div className="grid gap-px overflow-hidden rounded-[3px] bg-paper/10 ring-1 ring-paper/10 lg:grid-cols-[320px_1fr]">
      <div className="order-last flex flex-col gap-7 bg-ink-2 p-5 sm:p-6 lg:order-none">
        <div>
          <p className="eyebrow mb-3 text-paper/45">Direction</p>
          <div className="grid grid-cols-2 gap-2">
            {dirs.map((x, i) => (
              <button
                key={x.id}
                onClick={() => setActive(i)}
                aria-pressed={active === i}
                className={cx("group rounded-[3px] p-2.5 text-left ring-1 transition", active === i ? "bg-paper/[0.06] ring-volt" : "ring-paper/10 hover:ring-paper/30")}
              >
                <div className="mb-2 flex h-5 overflow-hidden rounded-[2px]">
                  {Object.values(x.palette).map((c, j) => (
                    <span key={j} className="flex-1" style={{ background: c }} />
                  ))}
                </div>
                <span className="text-[12px] font-medium text-paper">{x.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow text-paper/45">Palette</p>
            <button className="flex items-center gap-1 text-[11px] text-paper/50 hover:text-paper" onClick={() => patch({ palette: demoDirections[active].palette })}>
              <RotateCcw size={11} /> Reset
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {(Object.entries(d.palette) as [keyof IdentityDirection["palette"], string][]).map(([k, hex]) => (
              <label key={k} className="group cursor-pointer text-center">
                <span className="relative block aspect-square rounded-[3px] ring-1 ring-paper/15 transition group-hover:ring-paper/60" style={{ background: hex }}>
                  <input type="color" value={hex} onChange={(e) => patch({ palette: { ...d.palette, [k]: e.target.value.toUpperCase() } })} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={`${k} colour`} />
                </span>
                <span className="mt-1.5 block truncate font-mono text-[9px] tracking-wider text-paper/45 uppercase">{k}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="studio-font" className="eyebrow mb-3 block text-paper/45">
            Display typeface
          </label>
          <select id="studio-font" value={d.typography.display} onChange={(e) => patch({ typography: { ...d.typography, display: e.target.value as FontKey } })} className="input input-dark">
            {DISPLAY_FONTS.map((f) => (
              <option key={f} value={f}>
                {FONTS[f].family}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-auto hidden border-t border-paper/10 pt-5 text-[13px] leading-relaxed text-paper/60 lg:block">
          <p className="mb-1 text-paper">{demoPositioning.final!.title}</p>
          {demoVoice.summary}
        </div>
      </div>

      <div className="flex min-w-0 flex-col bg-ink">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/10 p-3">
          <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
            <Segmented dark size="sm" label="Application" value={view} onChange={setView} options={VIEWS} />
          </div>
          <Segmented
            dark
            size="sm"
            label="Background"
            value={surface}
            onChange={setSurface}
            options={[
              { value: "light", label: <Sun size={13} aria-label="Light" />, title: "Light background" },
              { value: "dark", label: <Moon size={13} aria-label="Dark" />, title: "Dark background" },
            ]}
          />
        </div>
        <div className="h-[420px] sm:h-[480px]">
          <IdentityCanvas d={d} name={DEMO_NAME} view={view} surface={surface} copy={{ tagline: demoVoice.taglines[0], headline: demoVoice.websiteCopy.headline, subhead: demoVoice.websiteCopy.subhead, cta: demoVoice.websiteCopy.cta }} />
        </div>
        <div className="flex flex-col items-start justify-between gap-3 border-t border-paper/10 p-4 sm:flex-row sm:items-center">
          <p className="text-[12px] text-paper/50">Changes here are local to this page. In the workspace they autosave as versions.</p>
          <Link to="/demo" className="btn btn-sm btn-line text-paper">
            Open the full demo workspace <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
