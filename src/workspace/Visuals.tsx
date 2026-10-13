import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Columns2, Copy, Download, Moon, Plus, Save, Sun, Trash2, Wand2 } from "lucide-react";
import { FONT_KEYS, MARK_STYLES, MOTIFS, uid, type FontKey, type IdentityDirection, type MarkStyle, type Motif, type Voice } from "@shared/schemas";
import { FONTS, MARK_PATHS, constructDirections, contrast, logoSvg, motifTile } from "@shared/identity";
import { endpoints } from "@/lib/api";
import { IdentityCanvas, Logo, type CanvasView, type Surface } from "@/components/identity";
import { ConfirmDialog, Dialog, Segmented, cx, useToast } from "@/components/ui";
import { useArtifact } from "./useArtifact";
import { useWorkspace } from "./context";
import { AiButton, NextStage, PageLoading, StageHeader } from "./parts";

const VIEWS: { value: CanvasView; label: string }[] = [
  { value: "logo", label: "Logo" },
  { value: "web", label: "Website" },
  { value: "social", label: "Social" },
  { value: "merch", label: "Merch" },
  { value: "type", label: "Type" },
];
const SOURCE_LABEL = { ai: "AI", constructed: "Rules", user: "Custom" } as const;
const BLANK: Omit<IdentityDirection, "id"> = {
  name: "Custom direction",
  rationale: "",
  palette: { primary: "#1F1F1D", secondary: "#8C8A80", accent: "#D7FF64", ink: "#111110", paper: "#F5F2EA" },
  typography: { display: "space-grotesk", text: "inter" },
  mark: "circle",
  wordmark: { case: "title", tracking: 0, weight: 600 },
  motif: "none",
  imageDirection: "",
  source: "user",
};

export default function Visuals() {
  const { pid, project } = useWorkspace();
  const art = useArtifact("identity");
  const toast = useToast();
  const [voice, setVoice] = useState<Voice | null>(null);
  const [view, setView] = useState<CanvasView>("logo");
  const [surface, setSurface] = useState<Surface>("light");
  const [compareId, setCompareId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("");
  const [removing, setRemoving] = useState<IdentityDirection | null>(null);
  useEffect(() => {
    endpoints.artifact(pid, "voice").then((r) => setVoice(r.artifact.status === "empty" ? null : r.artifact.data)).catch(() => setVoice(null));
  }, [pid]);

  const id = art.draft;
  if (!id) return <PageLoading dark />;
  const d = id.directions.find((x) => x.id === id.activeId) ?? id.directions[0] ?? null;
  const other = compareId ? (id.directions.find((x) => x.id === compareId) ?? id.variations.find((v) => v.id === compareId)?.direction ?? null) : null;
  const name = project.brand.name;
  const copy = { tagline: voice?.taglines[0] ?? "", headline: voice?.websiteCopy.headline ?? "", subhead: voice?.websiteCopy.subhead ?? "", cta: voice?.websiteCopy.cta ?? "" };

  const patch = (p: Partial<IdentityDirection>) => art.update((x) => ({ ...x, directions: x.directions.map((y) => (y.id === d!.id ? { ...y, ...p } : y)) }));
  const add = (dirs: IdentityDirection[], note: string, source: "manual" | "rules" = "manual") => {
    art.update((x) => ({ ...x, directions: [...dirs, ...x.directions.filter((y) => !dirs.some((n) => n.id === y.id))].slice(0, 6), activeId: dirs[0].id }));
    art.checkpoint(note, source);
  };
  const construct = () => {
    if (!voice) return toast("Set the voice sliders first: construction reads them.", "error");
    const made = constructDirections(voice.sliders).map((x) => ({ ...x, id: `${x.id}-${uid().slice(0, 4)}` }));
    art.update((x) => ({ ...x, directions: [...made, ...x.directions.filter((y) => y.source !== "constructed")].slice(0, 6), activeId: made[0].id }));
    art.checkpoint("Constructed three directions from the voice sliders", "rules");
  };
  const downloadSvg = (variant: "primary" | "mark" | "reversed") => {
    const blob = new Blob([logoSvg(d!, name, variant, { embedFonts: true })], { type: "image/svg+xml" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-logo-${variant}.svg` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="min-h-dvh bg-ink text-paper">
      <StageHeader
        dark
        compact
        path="visuals"
        title={
          <>
            Identity studio. <span className="serif-em text-paper/70">Every token, live.</span>
          </>
        }
        intro="Palette, type, mark, motif and image direction, previewed across real applications. Edits autosave as a draft version."
        art={art}
        approveBlock={!d ? "Create a direction first" : null}
        extra={
          <>
            <button className="btn btn-sm btn-line text-paper" onClick={construct} title="Pick the three curated systems closest to your voice settings. No AI involved.">
              <Wand2 size={14} /> Construct from voice
            </button>
            <AiButton dark label="Generate with AI" busy={art.generating} onCancel={art.cancel} onRun={() => art.generate("identity")} />
          </>
        }
      />

      {/* Direction tabs */}
      <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-paper/10 px-4 py-3 sm:px-8 lg:px-12" role="tablist" aria-label="Identity directions">
        {id.directions.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === d?.id}
            onClick={() => art.update((y) => ({ ...y, activeId: x.id }))}
            className={cx("group flex shrink-0 items-center gap-3 rounded-[3px] py-2 pr-3 pl-2 ring-1 transition", x.id === d?.id ? "bg-paper/[0.07] ring-volt" : "ring-paper/10 hover:ring-paper/30")}
          >
            <span className="flex h-7 w-10 overflow-hidden rounded-[2px]">
              {[x.palette.primary, x.palette.secondary, x.palette.accent].map((c, i) => (
                <span key={i} className="flex-1" style={{ background: c }} />
              ))}
            </span>
            <span className="text-left">
              <span className="block max-w-36 truncate text-[13px] font-medium">{x.name || "Untitled"}</span>
              <span className="block font-mono text-[9px] tracking-wider text-paper/45 uppercase">{SOURCE_LABEL[x.source]}</span>
            </span>
          </button>
        ))}
        <button className="flex shrink-0 items-center gap-2 rounded-[3px] px-3 text-[13px] text-paper/60 ring-1 ring-paper/10 ring-dashed hover:text-paper" onClick={() => add([{ ...BLANK, id: uid() }], "Added a custom direction")} disabled={id.directions.length >= 6}>
          <Plus size={14} /> Custom
        </button>
      </div>

      {!d ? (
        <div className="grid place-items-center px-4 py-24 text-center">
          <div className="max-w-lg">
            <p className="font-display text-3xl font-semibold tracking-tight">Start the identity.</p>
            <p className="mt-3 text-[15px] leading-relaxed text-paper/60">Construct three directions from your voice settings (a rules-based starting point, not AI), generate them with AI from the approved positioning, or start from a blank custom direction.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <button className="btn btn-volt" onClick={construct}>
                <Wand2 size={15} /> Construct from voice
              </button>
              <button className="btn btn-line text-paper" onClick={() => add([{ ...BLANK, id: uid() }], "Added a custom direction")}>
                <Plus size={15} /> Blank direction
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 border-paper/10 lg:border-r">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:px-12">
              <div className="scrollbar-none -mx-1 max-w-full overflow-x-auto px-1">
                <Segmented dark size="sm" label="Application preview" value={view} onChange={setView} options={VIEWS} />
              </div>
              <div className="flex items-center gap-2">
                <Segmented
                  dark
                  size="sm"
                  label="Background"
                  value={surface}
                  onChange={setSurface}
                  options={[
                    { value: "light", label: <Sun size={13} aria-label="Light background" /> },
                    { value: "dark", label: <Moon size={13} aria-label="Dark background" /> },
                  ]}
                />
                <label className="sr-only" htmlFor="compare">
                  Compare with
                </label>
                <div className="flex items-center gap-1.5 rounded-[3px] px-2 py-1 ring-1 ring-paper/10">
                  <Columns2 size={13} className="text-paper/50" />
                  <select id="compare" value={compareId ?? ""} onChange={(e) => setCompareId(e.target.value || null)} className="max-w-36 bg-transparent text-[12px] text-paper/80 outline-none">
                    <option value="">Compare…</option>
                    {id.directions
                      .filter((x) => x.id !== d.id)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    {id.variations.map((v) => (
                      <option key={v.id} value={v.id}>
                        ◇ {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={cx("grid gap-6 px-4 sm:px-8 lg:px-12", other ? "md:grid-cols-2" : "")}>
              <figure className="cropmarks text-paper">
                <div className="h-[min(62vh,620px)] min-h-[380px] overflow-hidden rounded-[2px]">
                  <IdentityCanvas d={d} name={name} copy={copy} view={view} surface={surface} />
                </div>
                {other && <figcaption className="mt-3 font-mono text-[11px] text-paper/50">{d.name}</figcaption>}
              </figure>
              {other && (
                <figure className="cropmarks text-paper">
                  <div className="h-[min(64vh,600px)] min-h-[380px] overflow-hidden rounded-[2px]">
                    <IdentityCanvas d={other} name={name} copy={copy} view={view} surface={surface} />
                  </div>
                  <figcaption className="mt-3 font-mono text-[11px] text-paper/50">{other.name}</figcaption>
                </figure>
              )}
            </div>

            <div className="px-4 py-8 sm:px-8 lg:px-12">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="eyebrow text-paper/45">Saved variations · {id.variations.length}</p>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-sm btn-line text-paper" onClick={() => (setLabel(`${d.name} · v${id.variations.length + 1}`), setSaving(true))} disabled={id.variations.length >= 24}>
                    <Save size={14} /> Save variation
                  </button>
                  <button className="btn btn-sm btn-line text-paper" onClick={() => add([{ ...d, id: uid(), name: `${d.name} copy`, source: "user" }], `Duplicated ${d.name}`)} disabled={id.directions.length >= 6}>
                    <Copy size={14} /> Duplicate
                  </button>
                  <button className="btn btn-sm btn-quiet text-paper/50 hover:text-signal" onClick={() => setRemoving(d)} aria-label="Delete direction">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {id.variations.length === 0 ? (
                <p className="text-[13px] text-paper/45">Save a variation to keep a snapshot of this direction you can compare against or restore.</p>
              ) : (
                <ul className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
                  {id.variations.map((v) => (
                    <li key={v.id} className="w-44 shrink-0">
                      <div className="grid h-24 place-items-center p-4 ring-1 ring-paper/10" style={{ background: v.direction.palette.paper }}>
                        <Logo d={v.direction} name={name} className="w-full [&>svg]:max-h-12" />
                      </div>
                      <p className="mt-2 truncate text-[12px]">{v.label}</p>
                      <div className="mt-1 flex gap-3 text-[11px] text-paper/50">
                        <button className="hover:text-paper" onClick={() => patch({ ...v.direction, id: d.id, name: d.name })}>
                          Apply
                        </button>
                        <button className="hover:text-paper" onClick={() => setCompareId(v.id)}>
                          Compare
                        </button>
                        <button className="hover:text-signal" onClick={() => art.update((x) => ({ ...x, variations: x.variations.filter((y) => y.id !== v.id) }))}>
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Inspector d={d} patch={patch} onDownload={downloadSvg} />
        </div>
      )}
      <NextStage dark path="visuals" />

      <Dialog open={saving} onClose={() => setSaving(false)} title="Save variation">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            art.update((x) => ({ ...x, variations: [{ id: uid(), label: label.trim() || d!.name, savedAt: new Date().toISOString(), direction: { ...d! } }, ...x.variations].slice(0, 24) }));
            setSaving(false);
            toast("Variation saved", "success");
          }}
        >
          <label className="field-label" htmlFor="var-label">
            Label
          </label>
          <input id="var-label" autoFocus className="input" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} />
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn btn-line" onClick={() => setSaving(false)}>
              Cancel
            </button>
            <button className="btn btn-ink">Save</button>
          </div>
        </form>
      </Dialog>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        danger
        title={`Delete “${removing?.name}”?`}
        confirmLabel="Delete direction"
        body="The direction is removed from the studio. Earlier versions stay in history."
        onConfirm={() => {
          art.update((x) => {
            const rest = x.directions.filter((y) => y.id !== removing!.id);
            return { ...x, directions: rest, activeId: rest[0]?.id ?? null };
          });
          art.checkpoint(`Deleted direction ${removing!.name}`);
        }}
      />
    </div>
  );
}

function Group({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-b border-paper/10 px-5 py-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="eyebrow text-paper/50">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Ratio({ value, min, label }: { value: number; min: number; label: string }) {
  const ok = value >= min;
  return (
    <span className={cx("flex items-center gap-1.5 font-mono text-[10px]", ok ? "text-paper/60" : "text-signal")} title={`${label}: needs ${min}:1`}>
      <span className={cx("inline-block size-1.5 rotate-45", ok ? "bg-volt" : "bg-signal")} />
      {label} {value.toFixed(1)}:1
    </span>
  );
}

function Inspector({ d, patch, onDownload }: { d: IdentityDirection; patch: (p: Partial<IdentityDirection>) => void; onDownload: (v: "primary" | "mark" | "reversed") => void }) {
  const [hexDraft, setHexDraft] = useState<Record<string, string>>({});
  return (
    <aside className="border-t border-paper/10 bg-ink-2 lg:sticky lg:top-0 lg:max-h-dvh lg:overflow-y-auto lg:border-t-0" aria-label="Direction inspector">
      <Group title="Direction">
        <input aria-label="Direction name" className="input input-dark font-display !text-[17px] font-semibold" value={d.name} maxLength={60} onChange={(e) => patch({ name: e.target.value })} />
        <textarea aria-label="Rationale" rows={3} className="input input-dark mt-2 resize-y text-[13px] leading-relaxed" value={d.rationale} maxLength={800} placeholder="Why this direction fits the strategy" onChange={(e) => patch({ rationale: e.target.value })} />
      </Group>

      <Group title="Palette" aside={<div className="flex flex-col items-end gap-1"><Ratio label="ink/paper" value={contrast(d.palette.ink, d.palette.paper)} min={4.5} /><Ratio label="primary/paper" value={contrast(d.palette.primary, d.palette.paper)} min={3} /></div>}>
        <div className="space-y-2">
          {(Object.entries(d.palette) as [keyof IdentityDirection["palette"], string][]).map(([k, hex]) => (
            <div key={k} className="flex items-center gap-3">
              <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-[3px] ring-1 ring-paper/20" style={{ background: hex }}>
                <input type="color" value={hex} aria-label={`${k} colour picker`} onChange={(e) => patch({ palette: { ...d.palette, [k]: e.target.value.toUpperCase() } })} className="absolute inset-0 size-full cursor-pointer opacity-0" />
              </label>
              <span className="w-[74px] shrink-0 text-[13px] capitalize">{k}</span>
              <input
                aria-label={`${k} hex value`}
                className="input input-dark !py-1.5 font-mono !text-[12px] uppercase"
                value={hexDraft[k] ?? hex}
                maxLength={7}
                onChange={(e) => {
                  const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                  setHexDraft((h) => ({ ...h, [k]: v }));
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) patch({ palette: { ...d.palette, [k]: v.toUpperCase() } });
                }}
                onBlur={() => setHexDraft((h) => ({ ...h, [k]: undefined as unknown as string }))}
                aria-invalid={!!hexDraft[k] && !/^#[0-9a-fA-F]{6}$/.test(hexDraft[k])}
              />
            </div>
          ))}
        </div>
      </Group>

      <Group title="Typography">
        {(["display", "text"] as const).map((role) => (
          <label key={role} className="mb-3 block last:mb-0">
            <span className="mb-1.5 block text-[12px] text-paper/55 capitalize">{role}</span>
            <select className="input input-dark" value={d.typography[role]} onChange={(e) => patch({ typography: { ...d.typography, [role]: e.target.value as FontKey } })} style={{ fontFamily: `'${FONTS[d.typography[role]].family}'` }}>
              {FONT_KEYS.map((f) => (
                <option key={f} value={f}>
                  {FONTS[f].family}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-paper/40">{FONTS[d.typography[role]].note}</span>
          </label>
        ))}
      </Group>

      <Group title="Mark">
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Mark style">
          {MARK_STYLES.map((m: MarkStyle) => (
            <button key={m} role="radio" aria-checked={d.mark === m} title={m} onClick={() => patch({ mark: m })} className={cx("grid aspect-square place-items-center rounded-[3px] ring-1 transition", d.mark === m ? "bg-paper text-ink ring-paper" : "text-paper/70 ring-paper/15 hover:ring-paper/40")}>
              {m === "none" ? (
                <span className="text-[10px]">Aa</span>
              ) : (
                <svg viewBox="0 0 100 100" className="size-6" aria-hidden>
                  <path d={MARK_PATHS[m]} fill="currentColor" />
                </svg>
              )}
              <span className="sr-only">{m}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Wordmark">
        <Segmented
          dark
          size="sm"
          label="Letter case"
          value={d.wordmark.case}
          onChange={(c) => patch({ wordmark: { ...d.wordmark, case: c } })}
          options={[
            { value: "upper", label: "AA" },
            { value: "title", label: "Aa" },
            { value: "lower", label: "aa" },
          ]}
        />
        <label className="mt-4 block">
          <span className="flex justify-between text-[12px] text-paper/55">
            Tracking <span className="font-mono">{d.wordmark.tracking.toFixed(2)}em</span>
          </span>
          <input type="range" min={-0.08} max={0.4} step={0.01} value={d.wordmark.tracking} onChange={(e) => patch({ wordmark: { ...d.wordmark, tracking: Number(e.target.value) } })} className="slider text-paper" />
        </label>
        <label className="mt-2 block">
          <span className="mb-1.5 block text-[12px] text-paper/55">Weight</span>
          <Segmented
            dark
            size="sm"
            label="Weight"
            value={String(d.wordmark.weight)}
            onChange={(w) => patch({ wordmark: { ...d.wordmark, weight: Number(w) as 400 | 500 | 600 | 700 } })}
            options={["400", "500", "600", "700"].map((w) => ({ value: w, label: w }))}
          />
        </label>
      </Group>

      <Group title="Motif">
        <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Graphic motif">
          {MOTIFS.map((m: Motif) => (
            <button
              key={m}
              role="radio"
              aria-checked={d.motif === m}
              title={m}
              onClick={() => patch({ motif: m })}
              className={cx("aspect-square rounded-[3px] ring-1 transition", d.motif === m ? "ring-2 ring-volt" : "ring-paper/15 hover:ring-paper/40")}
              style={{ background: m === "none" ? "transparent" : `${d.palette.paper} url("data:image/svg+xml,${encodeURIComponent(motifTile(m, d.palette.ink, 0.7))}")` }}
            >
              {m === "none" && <span className="text-[10px] text-paper/60">none</span>}
              <span className="sr-only">{m}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Image direction">
        <textarea aria-label="Image direction" rows={3} className="input input-dark resize-y text-[13px] leading-relaxed" value={d.imageDirection} maxLength={800} onChange={(e) => patch({ imageDirection: e.target.value })} placeholder="Photography and illustration guidance" />
      </Group>

      <Group title="Assets">
        <div className="grid grid-cols-3 gap-1.5">
          {(["primary", "mark", "reversed"] as const).map((v) => (
            <button key={v} className="btn btn-sm btn-line text-paper capitalize" onClick={() => onDownload(v)}>
              <Download size={12} /> {v}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-paper/45">
          SVGs reference the typeface via Google Fonts. Full kit with PDF, tokens and CSS in{" "}
          <Link to="../brand-kit" relative="path" className="text-paper underline underline-offset-2">
            Brand kit
          </Link>
          .
        </p>
      </Group>
    </aside>
  );
}
