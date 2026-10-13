import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { endpoints } from "@/lib/api";
import { useSession } from "@/lib/session";
import { FoundryMark } from "@/components/Brand";

/** Opens (or reuses) the KORA sample project in the visitor's workspace, no sign-up required. */
export default function Demo() {
  const nav = useNavigate();
  const { refresh } = useSession();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    endpoints
      .demo()
      .then(async ({ id }) => {
        await refresh();
        nav(`/projects/${id}`, { replace: true });
      })
      .catch((e) => setError(e.message));
  }, [nav, refresh]);
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 text-paper">
      <div className="text-center">
        <FoundryMark size={44} className="mx-auto animate-pulse" />
        {error ? (
          <>
            <p className="mt-6 text-paper/80">{error}</p>
            <Link to="/" className="btn btn-line mt-6 text-paper">
              Back home
            </Link>
          </>
        ) : (
          <p className="eyebrow mt-6 text-paper/50">Opening the KORA demo project…</p>
        )}
      </div>
    </main>
  );
}
