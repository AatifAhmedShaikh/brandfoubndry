import { useCallback, useEffect, useRef, useState } from "react";
import type { ArtifactData, ArtifactKind, ArtifactRecord } from "@shared/schemas";
import { ApiError, api, endpoints } from "@/lib/api";
import { useBeforeUnload } from "@/lib/hooks";
import { useToast } from "@/components/ui";
import { useWorkspace } from "./context";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error" | "conflict";

/**
 * Loads one artifact and keeps a local draft that autosaves (debounced, folded into the current
 * draft version server-side). Approve / restore / generate update the record in place.
 */
export function useArtifact<K extends ArtifactKind>(kind: K) {
  const { pid, refresh } = useWorkspace();
  const toast = useToast();
  const [record, setRecord] = useState<ArtifactRecord<K> | null>(null);
  const [draft, setDraft] = useState<ArtifactData[K] | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [generating, setGenerating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef<ArtifactData[K] | null>(null);
  const revision = useRef(0);
  const abort = useRef<AbortController | null>(null);

  const accept = useCallback((a: ArtifactRecord<K>) => {
    setRecord(a);
    setDraft(a.data);
    latest.current = a.data;
    revision.current = a.revision;
  }, []);

  const load = useCallback(async () => {
    try {
      accept((await endpoints.artifact(pid, kind)).artifact);
      setLoadError(null);
    } catch (e) {
      setLoadError(e as ApiError);
    }
  }, [pid, kind, accept]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (opts: { coalesce: boolean; source?: "manual" | "rules"; note?: string }) => {
      clearTimeout(timer.current);
      if (!latest.current) return;
      setSaveState("saving");
      try {
        const { artifact } = await api<{ artifact: ArtifactRecord<K> }>(`/projects/${pid}/artifacts/${kind}`, {
          method: "PUT",
          body: { data: latest.current, baseRevision: revision.current || undefined, coalesce: opts.coalesce, source: opts.source ?? "manual", note: opts.note },
        });
        revision.current = artifact.revision;
        setRecord(artifact);
        setSaveState("saved");
        refresh();
        return artifact;
      } catch (e) {
        const err = e as ApiError;
        setSaveState(err.code === "conflict" ? "conflict" : "error");
        toast(err.message, "error");
      }
    },
    [pid, kind, refresh, toast],
  );

  /** Local edit; autosaves after a short pause. */
  const update = useCallback(
    (next: ArtifactData[K] | ((prev: ArtifactData[K]) => ArtifactData[K])) => {
      // Computed eagerly from the ref so an immediate checkpoint() saves this exact value.
      const value = typeof next === "function" ? (next as (p: ArtifactData[K]) => ArtifactData[K])(latest.current!) : next;
      latest.current = value;
      setDraft(value);
      setSaveState("pending");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => persist({ coalesce: true }), 900);
    },
    [persist],
  );

  // Flush a pending autosave when leaving the page inside the app.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        if (latest.current) void api(`/projects/${pid}/artifacts/${kind}`, { method: "PUT", body: { data: latest.current, coalesce: true } }).catch(() => {});
      }
    },
    [pid, kind],
  );

  useBeforeUnload(saveState === "pending" || saveState === "saving" || saveState === "error");

  const action = useCallback(
    async (path: "approve" | "unapprove" | "acknowledge", success: string) => {
      if (saveState === "pending") await persist({ coalesce: true });
      try {
        const { artifact } = await api<{ artifact: ArtifactRecord<K> }>(`/projects/${pid}/artifacts/${kind}/${path}`, { method: "POST" });
        accept(artifact);
        refresh();
        toast(success, "success");
        return artifact;
      } catch (e) {
        toast((e as ApiError).message, "error");
      }
    },
    [pid, kind, accept, refresh, toast, persist, saveState],
  );

  const restore = useCallback(
    async (version: number) => {
      try {
        const { artifact } = await api<{ artifact: ArtifactRecord<K> }>(`/projects/${pid}/artifacts/${kind}/restore`, { body: { version } });
        accept(artifact);
        refresh();
        toast(`Restored v${version} as v${artifact.version}`, "success");
      } catch (e) {
        toast((e as ApiError).message, "error");
      }
    },
    [pid, kind, accept, refresh, toast],
  );

  /** Runs a server-side AI task. Returns the raw result for tasks that don't produce an artifact. */
  const generate = useCallback(
    async <R = ArtifactRecord<K>>(task: string, body: Record<string, unknown> = {}, opts: { applies?: boolean } = { applies: true }): Promise<R | undefined> => {
      if (saveState === "pending") await persist({ coalesce: true });
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setGenerating(true);
      try {
        const { result } = await api<{ result: R }>(`/projects/${pid}/ai/${task}`, { body, signal: ctrl.signal });
        if (opts.applies) {
          accept(result as unknown as ArtifactRecord<K>);
          refresh();
        }
        return result;
      } catch (e) {
        if ((e as Error).name !== "AbortError") toast((e as ApiError).message, "error");
      } finally {
        if (abort.current === ctrl) setGenerating(false);
      }
    },
    [pid, accept, refresh, toast, persist, saveState],
  );

  const cancel = useCallback(() => {
    abort.current?.abort();
    setGenerating(false);
    toast("Generation cancelled.", "info");
  }, [toast]);

  return {
    record,
    draft,
    loadError,
    saveState,
    generating,
    update,
    reload: load,
    checkpoint: (note?: string, source?: "manual" | "rules") => persist({ coalesce: false, note, source }),
    approve: () => action("approve", "Approved"),
    unapprove: () => action("unapprove", "Returned to draft"),
    acknowledge: () => action("acknowledge", "Marked as still valid"),
    restore,
    generate,
    cancel,
  };
}

export type ArtifactApi<K extends ArtifactKind> = ReturnType<typeof useArtifact<K>>;

/** The kind-independent subset used by shared chrome (header, history, approval). */
export type ArtifactControls = Pick<ArtifactApi<ArtifactKind>, "saveState" | "approve" | "unapprove" | "acknowledge" | "restore" | "checkpoint" | "reload"> & { record: ArtifactRecord | null };
