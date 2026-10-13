import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { endpoints, type ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Wordmark } from "@/components/Brand";
import { AutoTextarea, Field, Spinner, cx } from "@/components/ui";
import { STAGES } from "@shared/workflow";

const KEY = "bf:new-project";
type Draft = { idea: string; name: string; industry: string; audience: string };
const empty: Draft = { idea: "", name: "", industry: "", audience: "" };

const read = (): Draft => {
  try {
    return { ...empty, ...JSON.parse(sessionStorage.getItem(KEY) ?? "{}") };
  } catch {
    return empty;
  }
};

export default function NewProject() {
  const [draft, setDraft] = useState<Draft>(read);
  const [more, setMore] = useState(() => !!(read().name || read().industry || read().audience));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, refresh } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    document.title = "New brand — BrandFoundry";
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable: the form still works */
    }
  }, [draft]);

  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const tooShort = draft.idea.trim().length < 12;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (tooShort) return setError("Describe the idea in a sentence or two so the brief has something to work with.");
    setBusy(true);
    setError(null);
    try {
      if (!user) await endpoints.guest();
      const name = draft.name.trim() || "Untitled brand";
      const { project } = await endpoints.createProject(name, { idea: draft.idea, industry: draft.industry, audience: draft.audience });
      sessionStorage.removeItem(KEY);
      await refresh();
      nav(`/projects/${project.id}/discover`);
    } catch (err) {
      setError((err as ApiError).message);
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <header className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-8">
        <Link to="/" aria-label="BrandFoundry home">
          <Wordmark size={22} />
        </Link>
        <Link to={user ? "/dashboard" : "/"} className="text-[13px] text-ink/60 hover:text-ink">
          {user ? "Back to projects" : "Back home"}
        </Link>
      </header>

      <form onSubmit={submit} className="mx-auto grid max-w-[1440px] gap-14 px-4 pt-8 pb-20 sm:px-8 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-8">
          <p className="eyebrow rise flex items-center gap-2 text-stone-dark">
            <span className="inline-block size-1.5 rotate-45 bg-ink" /> New brand · 01 Discover
          </p>
          <h1 className="rise mt-5 text-[length:var(--text-giant)] leading-[0.92] font-semibold tracking-[-0.045em]" style={{ ["--i" as string]: 1 }}>
            What are you <span className="serif-em">building?</span>
          </h1>
          <div className="rise mt-10" style={{ ["--i" as string]: 2 }}>
            <label htmlFor="idea" className="sr-only">
              Describe your business idea
            </label>
            <AutoTextarea
              id="idea"
              autoFocus
              value={draft.idea}
              onChange={set("idea")}
              maxLength={2000}
              aria-invalid={!!error && tooShort}
              placeholder="A refill-only stationery brand for design students — beautiful tools, zero plastic waste, sold on campus and online…"
              className="!rounded-none !border-0 !border-b-2 !border-ink !bg-transparent !px-0 !py-3 font-display !text-[clamp(1.35rem,2.6vw,2rem)] !leading-snug !tracking-tight placeholder:!text-ink/25 focus:!shadow-none"
            />
            <div className="mt-2 flex justify-between font-mono text-[11px] text-stone-dark">
              <span>Rough is fine. You'll refine it next.</span>
              <span>{draft.idea.length}/2000</span>
            </div>
          </div>

          <div className="rise mt-10" style={{ ["--i" as string]: 3 }}>
            <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className="flex items-center gap-2 text-[14px] font-medium">
              <ChevronDown size={16} className={cx("transition", more && "rotate-180")} /> Add a little more detail <span className="font-normal text-stone-dark">optional</span>
            </button>
            {more && (
              <div className="fade-in mt-6 grid gap-5 sm:grid-cols-3">
                <Field label="Working name" htmlFor="name" hint="You can find a real name later.">
                  <input id="name" className="input" maxLength={80} value={draft.name} onChange={set("name")} placeholder="Untitled brand" />
                </Field>
                <Field label="Industry" htmlFor="industry">
                  <input id="industry" className="input" maxLength={160} value={draft.industry} onChange={set("industry")} placeholder="e.g. Stationery" />
                </Field>
                <Field label="Who is it for?" htmlFor="audience">
                  <input id="audience" className="input" maxLength={800} value={draft.audience} onChange={set("audience")} placeholder="e.g. Design students" />
                </Field>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-8 border-l-2 border-signal bg-sheet px-4 py-3 text-[14px]">
              {error}
            </p>
          )}

          <div className="rise mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center" style={{ ["--i" as string]: 4 }}>
            <button className="btn btn-lg btn-ink group" disabled={busy}>
              {busy && <Spinner size={16} />} Start the brief <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
            </button>
            <p className="max-w-sm text-[13px] leading-snug text-ink/55">{user && !user.isGuest ? "Saved to your account." : "No account needed. Your project is saved as a guest workspace; create an account any time to keep it."}</p>
          </div>
        </div>

        <aside className="lg:col-span-4 lg:pt-28">
          <p className="eyebrow mb-5 text-stone-dark">What happens next</p>
          <ol className="border-t border-ink/15">
            {STAGES.map((s, i) => (
              <li key={s.key} className={cx("flex items-baseline gap-4 border-b border-ink/10 py-3 text-[14px]", i === 0 ? "text-ink" : "text-ink/45")}>
                <span className="font-mono text-[11px]">{s.n}</span>
                <span className="font-medium">{s.label}</span>
                <span className="ml-auto truncate text-[12px]">{s.pages.map((p) => p.label).join(" · ")}</span>
              </li>
            ))}
          </ol>
        </aside>
      </form>
    </main>
  );
}
