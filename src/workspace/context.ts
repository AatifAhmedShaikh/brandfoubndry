import { createContext, useContext } from "react";
import type { Project } from "@/lib/api";

export type WorkspaceCtx = { pid: string; project: Project; refresh: () => void };
export const WorkspaceContext = createContext<WorkspaceCtx | null>(null);

export function useWorkspace() {
  const c = useContext(WorkspaceContext);
  if (!c) throw new Error("useWorkspace outside workspace");
  return c;
}
