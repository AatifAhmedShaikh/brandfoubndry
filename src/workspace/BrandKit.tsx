import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Download, FileCode2, FileJson, FileText, FileType2, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { CORE_KINDS, KIND_LABEL, KIND_PATH } from "@shared/workflow";
import { casedName, fontStack, FONTS } from "@shared/identity";
import { endpoints, type ExportEntry } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { logoPng } from "@/lib/png";
import { Logo, PaletteStrip } from "@/components/identity";
import { Notice, Spinner, StatusGlyph, cx, useToast } from "@/components/ui";
import { useWorkspace } from "./context";
import { PageLoading, SectionTitle, StageHeader } from "./parts";

const ICON: Record<string, typeof FileText> = { PDF: FileText, Markdown: FileType2, JSON: FileJson, CSS: FileCode2, SVG: ImageIcon, PNG: ImageIcon };
const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

type Done = Record<string, { size: number } | { error: string }>;

function save(blob: Blob, filename: string) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function BrandKit() {
  const { pid, project } = useWorkspace();
  const toast = useToast();
  const manifest = useLoad(() => endpoints.exports(pid), [pid, project.updatedAt]);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Done>({});
  const d = project.brand.direction;
  const name = project.brand.name;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
  useEffect(() => {
    document.title = `Brand kit · ${name} — BrandFoundry`;
  }, [name]);

  if (!manifest.data) return manifest.error ? <Notice tone="danger" title="Couldn't load exports">{manifest.error.message}</Notice> : <PageLoading />;
  const by = new Map(project.summaries.map((s) => [s.kind, s]));
  const unapproved = CORE_KINDS.filter((k) => by.get(k)?.status !== "approved");
  const stale = project.summaries.filter((s) => s.staleReason);

  /** Fetches the generated file, checks it is non-empty, then hands it to the browser. */
  const download = async (f: ExportEntry) => {
    setBusy(f.file);
    try {
      const res = await fetch(`/api/projects/${pid}/export/${f.file}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Export failed (${res.status})`);
      const blob = await res.blob();
      if (!blob.size) throw new Error("The generated file was empty");
      const filename = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `${slug}-${f.file}`;
      save(blob, filename);
      setDone((x) => ({ ...x, [f.file]: { size: blob.size } }));
    } catch (e) {
      setDone((x) => ({ ...x, [f.file]: { error: (e as Error).message } }));
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };
  const downloadPng = async (variant: "primary" | "mark" | "reversed") => {
    if (!d) return;
    const key = `png-${variant}`;
    setBusy(key);
    try {
      const blob = await logoPng(d, name, variant);
      save(blob, `${slug}-logo-${variant}.png`);
      setDone((x) => ({ ...x, [key]: { size: blob.size } }));
    } catch (e) {
      setDone((x) => ({ ...x, [key]: { error: (e as Error).message } }));
    } finally {
      setBusy(null);
    }
  };

  const rows: (ExportEntry & { onClick: () => void; key: string; filename: string })[] = [
    ...manifest.data.files.map((f) => ({ ...f, key: f.file, filename: `${slug}-${f.file}`, onClick: () => download(f) })),
    ...(["primary", "mark", "reversed"] as const).map((v) => ({ file: `png-${v}`, key: `png-${v}`, filename: `${slug}-logo-${v}.png`, label: `Logo preview · ${v}`, format: "PNG", available: !!d, reason: d ? null : "Needs a visual identity direction", onClick: () => downloadPng(v) })),
  ];

  return (
    <div>
      <StageHeader
        path="brand-kit"
        title={
          <>
            The brand, <span className="serif-em">packed to travel.</span>
          </>
        }
        intro="Every file is generated on request from the current artifacts and checked before it's handed to you. Unapproved drafts are exported as drafts and labelled that way inside the documents."
      />

      <div className="grid gap-12 px-4 py-10 sm:px-8 lg:grid-cols-12 lg:px-12">
        <aside className="lg:col-span-5">
          <div className="cropmarks text-ink">
            <div className="aspect-[1/1.3] overflow-hidden shadow-[0_40px_80px_-50px_rgb(0_0_0/0.6)] ring-1 ring-ink/10" style={{ background: d?.palette.ink ?? "#111110", color: d?.palette.paper ?? "#F5F2EA" }}>
              <div className="flex h-full flex-col p-8">
                {d && <Logo d={d} name={name} variant="mark-reversed" className="size-16" />}
                <div className="mt-auto">
                  <p className="text-[clamp(2.2rem,5vw,3.6rem)] leading-[0.9] font-bold break-words" style={{ fontFamily: d ? fontStack(d.typography.display) : undefined, letterSpacing: "-0.03em" }}>
                    {d ? casedName(name, d.wordmark.case) : name}
                  </p>
                  <p className="mt-2 font-serif text-2xl italic opacity-80">Brand guidelines</p>
                </div>
                {d && <PaletteStrip d={d} labels={false} className="mt-8 h-6" />}
              </div>
            </div>
          </div>
          {d && (
            <p className="mt-4 font-mono text-[11px] text-ink/50">
              {d.name} · {FONTS[d.typography.display].family} / {FONTS[d.typography.text].family}
            </p>
          )}

          <div className="mt-10">
            <SectionTitle>Readiness</SectionTitle>
            <ul className="space-y-2">
              {CORE_KINDS.map((k) => {
                const s = by.get(k);
                return (
                  <li key={k} className="flex items-center gap-3 text-[14px]">
                    <StatusGlyph status={s?.status ?? "empty"} stale={!!s?.staleReason} />
                    <Link to={`/projects/${pid}/${KIND_PATH[k]}`} className="flex-1 hover:underline">
                      {KIND_LABEL[k]}
                    </Link>
                    <span className="font-mono text-[11px] text-ink/50">{s?.staleReason ? "needs review" : s?.status === "approved" ? `approved v${s.approvedVersion}` : (s?.status ?? "not started")}</span>
                  </li>
                );
              })}
            </ul>
            {(unapproved.length > 0 || stale.length > 0) && (
              <p className="mt-4 flex gap-2 border-l-2 border-amber pl-3 text-[13px] leading-relaxed text-ink/70">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {unapproved.length > 0 && `${unapproved.length} core artifact${unapproved.length > 1 ? "s are" : " is"} not approved. `}
                {stale.length > 0 && `${stale.length} need${stale.length > 1 ? "" : "s"} review. `}
                You can still export; documents mark drafts clearly.
              </p>
            )}
          </div>
        </aside>

        <section className="lg:col-span-7" aria-labelledby="files">
          <SectionTitle>
            <span id="files">Kit contents</span>
          </SectionTitle>
          <ul>
            {rows.map((f) => {
              const Icon = ICON[f.format] ?? FileText;
              const result = done[f.key];
              return (
                <li key={f.key} className={cx("grid grid-cols-[36px_1fr_auto] items-center gap-4 border-b border-ink/15 py-4", !f.available && "opacity-50")}>
                  <span className="grid size-9 place-items-center rounded-[3px] bg-ink/[0.06]">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[15px] font-medium">
                      {f.label} <span className="chip !py-0 text-ink/55">{f.format}</span>
                    </p>
                    <p className="truncate font-mono text-[11px] text-ink/50">
                      {f.available ? f.filename : f.reason}
                      {result && "size" in result && <span className="ml-2 text-ink">· verified {kb(result.size)}</span>}
                      {result && "error" in result && <span className="ml-2 text-signal">· {result.error}</span>}
                    </p>
                  </div>
                  <button className={cx("btn btn-sm", result && "size" in result ? "btn-line" : "btn-ink")} disabled={!f.available || busy !== null} onClick={f.onClick} aria-label={`Download ${f.label}`}>
                    {busy === f.key ? <Spinner size={14} /> : result && "size" in result ? <Check size={14} /> : <Download size={14} />}
                    <span className="hidden sm:inline">{result && "size" in result ? "Again" : "Download"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 text-[12px] leading-relaxed text-ink/55">PDF, Markdown, JSON, CSS and SVG are generated on the server. PNG previews are rasterised in your browser from the same logo geometry. Name and logo availability is not checked by BrandFoundry.</p>
        </section>
      </div>
    </div>
  );
}
