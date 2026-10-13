# ADR 0002 — Versioned artifacts with conservative invalidation

**Status:** accepted

**Decision.** Each workflow artifact has a row in `artifacts` and immutable rows in `artifact_versions`. Approval points at a version. Any save to an artifact sets `stale_reason` on every existing transitive dependant (`downstreamOf` in `shared/workflow.ts`). Content is never rewritten. The flag clears only on an explicit "Still valid", an approval, or regeneration from current inputs (AI or rules).

Rapid manual edits within 15 minutes, by the same user, on an unapproved draft are folded into the current version, so autosave doesn't flood history. Optimistic concurrency uses a `revision` counter (409 on conflict).

**Why conservative.** Detecting "meaningful" change semantically is unreliable. A false "needs review" costs one click. A missed contradiction costs a broken brand.
