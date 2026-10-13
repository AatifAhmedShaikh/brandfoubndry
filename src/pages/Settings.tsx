import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type ApiError } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { AppFrame } from "@/components/AppFrame";
import { ConfirmDialog, Field, Spinner, useToast } from "@/components/ui";

export default function Settings() {
  return (
    <AppFrame>
      <SettingsBody />
    </AppFrame>
  );
}

function Row({ title, desc, children }: { title: string; desc: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-ink/15 py-10 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-ink/60">{desc}</p>
      </div>
      <div className="lg:col-span-6 lg:col-start-6">{children}</div>
    </section>
  );
}

function SettingsBody() {
  const { user, ai, setUser } = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const usage = useLoad(() => api<{ requests: number; inputTokens: number; outputTokens: number }>("/me/usage"), []);
  const [name, setName] = useState(user?.displayName ?? "");
  const [pw, setPw] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  useEffect(() => {
    document.title = "Settings — BrandFoundry";
  }, []);

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("name");
    try {
      const r = await api<{ user: typeof user }>("/me", { method: "PATCH", body: { displayName: name } });
      setUser(r.user);
      toast("Name saved", "success");
    } catch (err) {
      toast((err as ApiError).message, "error");
    } finally {
      setBusy(null);
    }
  };
  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("pw");
    try {
      await api("/me/password", { body: pw });
      setPw({ current: "", next: "" });
      toast("Password changed. Other sessions were signed out.", "success");
    } catch (err) {
      toast((err as ApiError).message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto max-w-[1440px] px-4 pt-10 pb-24 sm:px-8 sm:pt-14">
      <h1 className="border-b border-ink/15 pb-10 text-[length:var(--text-huge)] leading-none font-semibold tracking-[-0.045em]">Settings</h1>

      <Row title="Account" desc={user?.isGuest ? "You're using a guest workspace tied to this browser." : `Signed in as ${user?.email}.`}>
        {user?.isGuest ? (
          <div className="bg-ink p-6 text-paper">
            <p className="font-display text-xl font-semibold">Keep your projects.</p>
            <p className="mt-2 text-[14px] text-paper/65">Create an account and every project in this guest workspace moves with you. Guest workspaces are removed after 30 days without activity.</p>
            <Link to="/auth?mode=register" className="btn btn-volt mt-5">
              Create account
            </Link>
          </div>
        ) : (
          <form onSubmit={saveName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Display name" htmlFor="dn">
                <input id="dn" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </div>
            <button className="btn btn-ink" disabled={busy === "name"}>
              {busy === "name" && <Spinner size={14} />} Save
            </button>
          </form>
        )}
      </Row>

      {!user?.isGuest && (
        <Row title="Password" desc="Changing your password signs out every other session.">
          <form onSubmit={changePw} className="grid gap-4 sm:grid-cols-2">
            <Field label="Current password" htmlFor="cpw">
              <input id="cpw" type="password" autoComplete="current-password" className="input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </Field>
            <Field label="New password" htmlFor="npw" hint="At least 8 characters.">
              <input id="npw" type="password" autoComplete="new-password" minLength={8} className="input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </Field>
            <div>
              <button className="btn btn-ink" disabled={busy === "pw" || !pw.current || pw.next.length < 8}>
                {busy === "pw" && <Spinner size={14} />} Change password
              </button>
            </div>
          </form>
        </Row>
      )}

      <Row title="AI generation" desc="Generation runs on the server. API keys are never sent to your browser.">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] bg-ink/10 text-[14px] ring-1 ring-ink/10 sm:grid-cols-4">
          {[
            ["Status", ai.configured ? "Configured" : "Not configured"],
            ["Model", ai.configured ? ai.model : "—"],
            ["Requests · 30d", usage.data ? String(usage.data.requests) : "…"],
            ["Tokens · 30d", usage.data ? (usage.data.inputTokens + usage.data.outputTokens).toLocaleString() : "…"],
          ].map(([k, v]) => (
            <div key={k} className="bg-sheet p-4">
              <dt className="eyebrow text-stone-dark">{k}</dt>
              <dd className="mt-2 truncate font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {!ai.configured && <p className="mt-4 text-[13px] leading-relaxed text-ink/60">The server has no ANTHROPIC_API_KEY. Every artifact can still be written, edited, approved and exported by hand; the identity studio can also construct directions from your voice settings without AI.</p>}
      </Row>

      <Row title="Delete account" desc="Permanently deletes your account, every project, version and export history. This cannot be undone.">
        <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
          Delete my account
        </button>
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => (setConfirmDelete(false), setDeleteText(""))}
          danger
          title="Delete account?"
          confirmLabel="Delete everything"
          body={
            <>
              <p>All projects and their history will be permanently removed.</p>
              <label className="mt-4 block text-[13px] font-medium text-ink">
                Type DELETE to confirm
                <input className="input mt-2" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} />
              </label>
            </>
          }
          onConfirm={async () => {
            if (deleteText !== "DELETE") return toast("Type DELETE to confirm", "error");
            try {
              await api("/me", { method: "DELETE", body: { confirm: "DELETE" } });
              setUser(null);
              nav("/");
            } catch (err) {
              toast((err as ApiError).message, "error");
            }
          }}
        />
      </Row>
    </main>
  );
}
