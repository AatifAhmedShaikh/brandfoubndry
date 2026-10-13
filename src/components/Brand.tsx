import { cx } from "./ui";

/** BrandFoundry mark: an ingot (the refined form) with a diamond spark (the idea). */
export function FoundryMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <path d="M3 27 L9 13 H23 L29 27 Z" fill="currentColor" />
      <rect x="21.5" y="2.5" width="6" height="6" transform="rotate(45 24.5 5.5)" fill="#D7FF64" />
    </svg>
  );
}

export function Wordmark({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-display font-semibold tracking-[-0.035em]", className)} style={{ fontSize: size * 0.82 }}>
      <FoundryMark size={size} />
      <span>
        Brand<span className="font-bold">Foundry</span>
      </span>
    </span>
  );
}
