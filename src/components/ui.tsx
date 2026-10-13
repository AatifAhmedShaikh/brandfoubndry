import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Check, X, AlertTriangle, Info, Loader2 } from "lucide-react";
import type { ArtifactStatus } from "@shared/schemas";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ───────────────────────── Toasts ───────────────────────── */

type Tone = "success" | "error" | "info";
type Toast = { id: number; text: string; tone: Tone };
const ToastCtx = createContext<(text: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Tone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="rise pointer-events-auto flex max-w-md items-start gap-3 rounded-[3px] bg-ink px-4 py-3 text-sm text-paper shadow-[0_12px_40px_-12px_rgb(0_0_0/0.5)] ring-1 ring-paper/10">
            <span className={cx("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full", t.tone === "success" ? "bg-volt text-ink" : t.tone === "error" ? "bg-signal text-ink" : "bg-paper/20")}>
              {t.tone === "success" ? <Check size={11} strokeWidth={3} /> : t.tone === "error" ? <AlertTriangle size={10} strokeWidth={3} /> : <Info size={10} strokeWidth={3} />}
            </span>
            <span className="leading-snug">{t.text}</span>
            <button className="-mr-1 ml-1 text-paper/50 hover:text-paper" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ───────────────────────── Form ───────────────────────── */

export function Field({ label, hint, children, optional, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; optional?: boolean; htmlFor?: string }) {
  return (
    <div>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-stone-dark">optional</span>}
      </label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

/** Textarea that grows with its content. */
export function AutoTextarea({ className, value, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} rows={2} value={value} className={cx("input resize-none leading-relaxed", className)} {...rest} />;
}

/** Editable list of short strings, shown as chips. */
export function ChipInput({ value, onChange, placeholder, max = 12, suggestions = [], dark, label }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; suggestions?: string[]; dark?: boolean; label: string }) {
  const [text, setText] = useState("");
  const id = useId();
  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, "");
    if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase()) || value.length >= max) return;
    onChange([...value, v]);
    setText("");
  };
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <div>
      <div className={cx("input flex min-h-11 flex-wrap items-center gap-1.5 py-1.5", dark && "input-dark")} onClick={() => document.getElementById(id)?.focus()}>
        {value.map((v) => (
          <span key={v} className={cx("inline-flex items-center gap-1 rounded-[2px] py-0.5 pr-1 pl-2 text-[13px]", dark ? "bg-paper/10" : "bg-ink/[0.07]")}>
            {v}
            <button type="button" aria-label={`Remove ${v}`} className="rounded-[2px] p-0.5 opacity-50 hover:opacity-100" onClick={() => onChange(value.filter((x) => x !== v))}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          aria-label={label}
          value={text}
          placeholder={value.length ? "" : placeholder}
          disabled={value.length >= max}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            }
            if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(text)}
          className="min-w-[8ch] flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-stone"
        />
      </div>
      {remaining.length > 0 && value.length < max && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.slice(0, 10).map((s) => (
            <button type="button" key={s} onClick={() => add(s)} className={cx("rounded-full border px-2.5 py-1 text-[12px] transition", dark ? "border-paper/15 text-paper/70 hover:border-volt hover:text-paper" : "border-ink/15 text-ink/70 hover:border-ink hover:text-ink")}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Editable list of longer strings, one per row. */
export function ListEditor({ value, onChange, placeholder, max = 6, label }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; max?: number; label: string }) {
  return (
    <div className="space-y-2">
      {value.map((v, i) => (
        <div key={i} className="flex gap-2">
          <span className="w-6 shrink-0 pt-3 font-mono text-[11px] text-stone-dark">{String(i + 1).padStart(2, "0")}</span>
          <AutoTextarea aria-label={`${label} ${i + 1}`} value={v} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} className="py-2 text-[14px]" />
          <button type="button" aria-label={`Remove ${label} ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="btn btn-quiet self-start text-stone-dark">
            <X size={14} />
          </button>
        </div>
      ))}
      {value.length < max && (
        <button type="button" onClick={() => onChange([...value, ""])} className="btn btn-sm btn-line ml-8 text-ink/70">
          + Add {placeholder}
        </button>
      )}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label, dark, size = "md" }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; label: string; dark?: boolean; size?: "sm" | "md" }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("inline-flex rounded-[3px] p-0.5", dark ? "bg-paper/[0.06] ring-1 ring-paper/10" : "bg-ink/[0.05] ring-1 ring-ink/10")}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cx(
              "rounded-[2px] font-medium transition",
              size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]",
              on ? (dark ? "bg-paper text-ink" : "bg-ink text-paper") : dark ? "text-paper/60 hover:text-paper" : "text-ink/60 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Feedback ───────────────────────── */

export const Spinner = ({ size = 16, className }: { size?: number; className?: string }) => <Loader2 size={size} className={cx("animate-spin", className)} aria-hidden />;

export function StatusGlyph({ status, stale, className }: { status: ArtifactStatus; stale?: boolean; className?: string }) {
  if (stale) return <span className={cx("inline-block size-2.5 rotate-45 bg-signal", className)} aria-label="Needs review" />;
  if (status === "approved") return <span className={cx("inline-block size-2.5 rounded-full bg-volt ring-1 ring-ink/30", className)} aria-label="Approved" />;
  if (status === "draft") return <span className={cx("inline-block size-2.5 rounded-full border border-current bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]", className)} aria-label="Draft" />;
  return <span className={cx("inline-block size-2.5 rounded-full border border-current opacity-40", className)} aria-label="Not started" />;
}

export function Notice({ tone = "info", title, children, action, dark }: { tone?: "info" | "warn" | "danger"; title: ReactNode; children?: ReactNode; action?: ReactNode; dark?: boolean }) {
  return (
    <div className={cx("flex flex-col gap-3 border-l-2 py-3 pr-3 pl-4 sm:flex-row sm:items-start", tone === "warn" ? "border-amber" : tone === "danger" ? "border-signal" : dark ? "border-paper/40" : "border-ink", dark ? "bg-paper/[0.04] text-paper" : "bg-sheet")}>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">{title}</p>
        {children && <div className={cx("mt-1 text-[13px] leading-relaxed", dark ? "text-paper/70" : "text-ink/70")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ───────────────────────── Dialog ───────────────────────── */

export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx("modal m-auto w-[calc(100%-2rem)] rounded-[4px] bg-paper p-0 text-ink shadow-2xl", wide ? "max-w-2xl" : "max-w-md")}
    >
      {open && (
        <div className="p-6 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button className="btn btn-quiet -mt-1 -mr-2" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel, danger }: { open: boolean; onClose: () => void; onConfirm: () => void | Promise<void>; title: string; body: ReactNode; confirmLabel: string; danger?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="text-[14px] leading-relaxed text-ink/75">{body}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn btn-line" onClick={onClose}>
          Cancel
        </button>
        <button
          className={cx("btn", danger ? "bg-signal text-ink hover:bg-ink hover:text-paper" : "btn-ink")}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
            onClose();
          }}
        >
          {busy && <Spinner size={14} />}
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
