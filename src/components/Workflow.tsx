import type { ArtifactKind, ArtifactSummary } from "@shared/schemas";
import { KIND_LABEL, WORKFLOW_ORDER } from "@shared/workflow";
import type { IdentityDirection } from "@shared/schemas";
import { Logo } from "./identity";
import { cx } from "./ui";

/** Eight-segment meter showing each artifact's real state. */
export function WorkflowMeter({ summaries, className, dark }: { summaries: ArtifactSummary[]; className?: string; dark?: boolean }) {
  const by = new Map(summaries.map((s) => [s.kind, s]));
  const label = WORKFLOW_ORDER.map((k) => `${KIND_LABEL[k]}: ${by.get(k)?.staleReason ? "needs review" : (by.get(k)?.status ?? "not started")}`).join(", ");
  return (
    <div className={cx("flex gap-[3px]", className)} role="img" aria-label={label}>
      {WORKFLOW_ORDER.map((k: ArtifactKind) => {
        const s = by.get(k);
        const cls = s?.staleReason
          ? "bg-signal"
          : s?.status === "approved"
            ? dark
              ? "bg-volt"
              : "bg-ink"
            : s?.status === "draft"
              ? dark
                ? "bg-paper/40"
                : "bg-ink/35"
              : dark
                ? "bg-paper/10"
                : "bg-ink/10";
        return <span key={k} title={`${KIND_LABEL[k]} · ${s?.staleReason ? "needs review" : (s?.status ?? "not started")}`} className={cx("h-1.5 flex-1 rounded-[1px]", cls)} />;
      })}
    </div>
  );
}

/** Small square brand tile: the project's mark when an identity exists, a monogram otherwise. */
export function BrandTile({ name, direction, size = 48, className }: { name: string; direction: IdentityDirection | null; size?: number; className?: string }) {
  if (direction)
    return (
      <div className={cx("grid shrink-0 place-items-center overflow-hidden rounded-[3px]", className)} style={{ width: size, height: size, background: direction.palette.paper, padding: size * 0.16 }}>
        <Logo d={direction} name={name} variant="mark" className="h-full w-full" title={`${name} mark`} />
      </div>
    );
  return (
    <div className={cx("grid shrink-0 place-items-center rounded-[3px] bg-ink font-display font-bold text-paper", className)} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {(name.trim()[0] ?? "B").toUpperCase()}
    </div>
  );
}
