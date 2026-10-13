import { useCallback, useEffect, useRef, useState } from "react";
import type { FontKey } from "@shared/schemas";
import { googleFontsUrl } from "@shared/identity";
import { ApiError } from "./api";

/** Loads data once (and on demand), exposing loading / error / reload. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fnRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, "Unexpected error", "unknown"));
    } finally {
      setLoading(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void reload(), deps);
  return { data, setData, error, loading, reload };
}

/** Adds `.is-in` to `.reveal` children as they scroll into view. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("is-in"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("is-in"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return ref;
}

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const loaded = new Set<string>();
/** Brand-preview fonts load on demand from Google Fonts; the app's own fonts are bundled. */
export function useFonts(keys: FontKey[]) {
  const key = [...new Set(keys)].filter((k) => !["space-grotesk", "inter", "instrument-serif"].includes(k)).sort().join(",");
  useEffect(() => {
    if (!key || loaded.has(key)) return;
    loaded.add(key);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = googleFontsUrl(key.split(",") as FontKey[]);
    document.head.appendChild(link);
  }, [key]);
}

/** Warns before leaving the page while `dirty` is true. */
export function useBeforeUnload(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
}

export const timeAgo = (iso: string | null | undefined) => {
  if (!iso) return "";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
