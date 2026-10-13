import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { endpoints, type User } from "./api";

type SessionState = {
  user: User | null;
  ai: { configured: boolean; model: string };
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ai, setAi] = useState({ configured: false, model: "" });
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const s = await endpoints.session();
      setUser(s.user);
      setAi(s.ai);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return <Ctx.Provider value={{ user, ai, loading, refresh, setUser }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}
