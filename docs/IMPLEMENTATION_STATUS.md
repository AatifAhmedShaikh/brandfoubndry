# Implementation status

_Last updated: 2026-10-12_

| Phase | Status | Notes |
|---|---|---|
| 1. Foundation | Done | Tokens in `src/styles.css`, primitives in `src/components/ui.tsx`, workspace shell |
| 2. Visual experience | Done | Landing page (hero transformation, capability explorer, before/after, timeline, live studio, differentiators), dashboard, identity studio |
| 3. Persistence & security | Done | SQL migrations, scrypt + session cookies, guest sessions, ownership guard, JSON-only mutations, login throttle |
| 4. Brand workflow | Done | Discover, Research, Position, Voice, Naming, versioning, approvals, restore, stale flags |
| 5. AI services | Done (mock-tested) | Anthropic adapter, 8 tasks, Zod schemas, retries, rate limit, usage log, provenance. Not exercised against the live API: no key in the build environment |
| 6. Intelligence & validation | Done | Manual competitor evidence + AI analysis, four-perspective critique, 9-rule rubric + AI review |
| 7. Exports | Done | PDF, Markdown, JSON, CSS, SVG (server); PNG (client canvas) |
| 8. Testing & polish | Done | 30 Vitest tests, 3 Playwright journeys, rendered audit at 1440×900 and 390×844 |

## UI/UX audit (rendered in Chromium)

Fixed after inspecting the real screens:

- Discover accordion collapsed the section you were typing in once it became complete. The open section is now set once, on load. Found by the end-to-end test.
- The identity studio header pushed the canvas below the fold. Added a compact header; the canvas now fills the first screen.
- Marks became invisible on dark grounds: the brand-kit cover, the capability preview and the dark logo strip. Added a `mark-reversed` variant.
- Palette swatches that match their background disappeared. Swatches now have a hairline inset.
- Removed a decorative motif strip on the logo canvas and a stray shape in the final call to action.
- Stage-header actions wrapped unpredictably. They're now in two aligned rows, and "AI off" sits inline in the button.
- "Continue" pointed at optional research. It now goes to the next unapproved core stage.
- The differentiators section was three generic text columns. Each point now shows the real UI element that delivers it.
- The capability preview showed an invented rubric score. It now runs the real rubric on the demo data.
- On mobile, the studio canvas comes before its controls; the hero headline scale was raised; the first hero stage advances sooner.
- Missing `/assets/*` files returned the SPA HTML (MIME errors). They now 404.

## Next steps

1. Port `server/db.ts` to Postgres/Supabase with RLS when multi-instance hosting is needed.
2. Run the AI tasks against a live key and tune prompts against real outputs.
3. Convert wordmark text to outlines in exported SVG/PDF.
