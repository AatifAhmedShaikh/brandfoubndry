import { useState, type ReactNode } from "react";
import { Link, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Plus, Settings as SettingsIcon } from "lucide-react";
import { useSession } from "@/lib/session";
import { endpoints } from "@/lib/api";
import { Wordmark } from "./Brand";
import { Spinner, cx } from "./ui";

/** Redirects to /auth when there is no session (guest sessions count). */
export function RequireSession({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const loc = useLocation();
  if (loading)
    return (
      <div className="grid min-h-dvh place-items-center bg-paper text-ink/40">
        <Spinner size={20} />
      </div>
    );
  if (!user) return <Navigate to={`/auth?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}

export function GuestBanner({ dark }: { dark?: boolean }) {
  const { user } = useSession();
  if (!user?.isGuest) return null;
  return (
    <div className={cx("flex flex-col gap-2 px-4 py-2.5 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-8", dark ? "bg-ink-3 text-paper/80" : "bg-ink text-paper/80")}>
      <span className="flex items-center gap-2">
        <span className="inline-block size-1.5 shrink-0 rotate-45 bg-volt" />
        Guest workspace: your work is saved, but only this browser can reach it. Create an account to keep it.
      </span>
      <Link to="/auth?mode=register" className="font-medium text-volt underline-offset-4 hover:underline">
        Save my work →
      </Link>
    </div>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  const { user, setUser } = useSession();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <RequireSession>
      <div className="min-h-dvh bg-paper text-ink">
        <header className="bg-ink text-paper">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
            <div className="flex items-center gap-8">
              <Link to="/" aria-label="BrandFoundry home">
                <Wordmark size={22} />
              </Link>
              <nav className="hidden items-center gap-1 sm:flex" aria-label="App">
                {[
                  ["/dashboard", "Projects"],
                  ["/settings", "Settings"],
                ].map(([to, label]) => (
                  <NavLink key={to} to={to} className={({ isActive }) => cx("rounded-[3px] px-3 py-1.5 text-[13px] transition", isActive ? "bg-paper/10 text-paper" : "text-paper/60 hover:text-paper")}>
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/projects/new" className="btn btn-sm btn-volt">
                <Plus size={15} /> <span className="hidden sm:inline">New brand</span>
              </Link>
              <Link to="/settings" className="btn btn-quiet text-paper/70 sm:hidden" aria-label="Settings">
                <SettingsIcon size={17} />
              </Link>
              {user && !user.isGuest && (
                <button
                  className="btn btn-quiet text-paper/60 hover:text-paper"
                  aria-label="Sign out"
                  title={`Sign out ${user.email ?? ""}`}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await endpoints.logout().catch(() => {});
                    setUser(null);
                    nav("/");
                  }}
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </header>
        <GuestBanner />
        {children}
      </div>
    </RequireSession>
  );
}
