import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { endpoints, type ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Wordmark } from "@/components/Brand";
import { Field, Segmented, Spinner } from "@/components/ui";

export default function Auth() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(params.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { user, setUser } = useSession();
  const nav = useNavigate();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/dashboard";

  useEffect(() => {
    document.title = mode === "login" ? "Sign in — BrandFoundry" : "Create account — BrandFoundry";
  }, [mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = mode === "login" ? await endpoints.login(email, password) : await endpoints.register(email, password, name);
      setUser(r.user);
      nav(next, { replace: true });
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-dvh bg-paper text-ink lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-paper lg:flex">
        <Link to="/" aria-label="BrandFoundry home">
          <Wordmark size={26} />
        </Link>
        <div>
          <p className="max-w-lg text-[length:var(--text-huge)] leading-[0.98] font-semibold tracking-[-0.04em]">
            Build a brand that knows <span className="serif-em text-volt">exactly</span> what it stands for.
          </p>
          <ol className="mt-10 grid max-w-md grid-cols-4 gap-px bg-paper/10 font-mono text-[10px] tracking-wider text-paper/55 uppercase">
            {["Brief", "Position", "Identity", "Kit"].map((s, i) => (
              <li key={s} className="bg-ink px-3 py-3">
                <span className="text-paper/30">0{i + 1}</span>
                <br />
                {s}
              </li>
            ))}
          </ol>
        </div>
        <p className="text-[12px] text-paper/40">Your projects are private to your account.</p>
      </section>

      <section className="flex flex-col px-4 py-8 sm:px-10">
        <Link to="/" className="lg:hidden" aria-label="BrandFoundry home">
          <Wordmark size={22} />
        </Link>
        <div className="m-auto w-full max-w-sm py-10">
          <Segmented
            label="Account"
            value={mode}
            onChange={(m) => (setMode(m), setError(null))}
            options={[
              { value: "login", label: "Sign in" },
              { value: "register", label: "Create account" },
            ]}
          />
          <h1 className="mt-8 text-4xl font-semibold tracking-[-0.035em]">{mode === "login" ? "Welcome back." : "Keep your work."}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/65">
            {user?.isGuest
              ? mode === "register"
                ? "Your guest projects will move into this account automatically."
                : "Projects from this guest session will be added to your account."
              : mode === "login"
                ? "Sign in to continue to your brand projects."
                : "Create an account to save projects and pick them up anywhere."}
          </p>
          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            {mode === "register" && (
              <Field label="Your name" optional htmlFor="name">
                <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <input id="email" type="email" required className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
            </Field>
            <Field label="Password" htmlFor="password" hint={mode === "register" ? "At least 8 characters." : undefined}>
              <input id="password" type="password" required minLength={8} className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
            </Field>
            {error && (
              <p role="alert" className="border-l-2 border-signal bg-sheet px-3 py-2 text-[13px]">
                {error}
              </p>
            )}
            <button className="btn btn-lg btn-ink w-full" disabled={busy || !email || !password}>
              {busy ? <Spinner size={16} /> : null}
              {mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16} />
            </button>
          </form>
          <div className="mt-10 border-t border-ink/10 pt-6 text-[14px] text-ink/65">
            Just exploring?{" "}
            <Link to="/projects/new" className="font-medium text-ink underline underline-offset-4">
              Start a brand without an account
            </Link>{" "}
            or{" "}
            <Link to="/demo" className="font-medium text-ink underline underline-offset-4">
              open the demo
            </Link>
            .
          </div>
        </div>
      </section>
    </main>
  );
}
