# BrandFoundry — Implementation Plan

## Starting point

The repository was empty: no commits, no branches, no existing stack. Every choice below was made for a fresh build.

## Stack

| Concern | Choice | Why |
|---|---|---|
| UI | React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7 | Fast dev loop, typed end to end, design tokens in CSS |
| Icons | lucide-react | Consistent stroke icons, tree-shaken |
| API | Hono on Node 22 (`@hono/node-server`) | Small, typed, testable with `app.request()` and no network |
| Database | SQLite via the built-in `node:sqlite` module, SQL migrations | Zero native dependencies; runs locally and in tests. Schema is Postgres-portable (see ADR 0001) |
| Auth | Email + scrypt password hashes, opaque session tokens in httpOnly cookies, guest sessions | Lets visitors start a project with no sign-up; claim the account later |
| AI | `@anthropic-ai/sdk`, server-only, structured outputs validated with Zod | Keys never reach the browser; model output is treated as untrusted |
| Exports | Markdown, JSON tokens, CSS variables, SVG (string-built), PDF (pdfkit), PNG (client canvas raster of the real SVG) | Real files with no headless browser |
| Tests | Vitest (domain + API), Playwright (end-to-end) | Uses the preinstalled Chromium |

Supabase was not configured in the environment. To keep the app runnable and testable offline, I used SQLite. Ownership is enforced on the server for every project-scoped query (the equivalent of row-level security). ADR 0001 describes the path to Postgres.

## Phases

1. **Foundation.** Design tokens, fonts, primitives, application shell.
2. **Visual experience.** Landing page, dashboard, workspace navigation, identity studio.
3. **Persistence and security.** Migrations, auth, guest sessions, ownership, project CRUD, versioned artifacts.
4. **Brand workflow.** Discover, Position, Voice, Naming, plus dependency invalidation.
5. **AI services.** Provider adapter, schemas, retries, usage tracking, rate limits, provenance.
6. **Intelligence.** Competitor analysis (manual evidence plus AI hypotheses), challenge engine, consistency rubric.
7. **Exports.** PDF, Markdown, JSON, CSS, SVG, PNG.
8. **Testing and polish.** Unit, API and end-to-end tests; responsive checks in Chromium; documentation.

## Workflow model

```
brief ─┬─> research ─┐
       └─────────────┴─> positioning ─> voice ─> naming ─> identity ─> challenge
                                   └──────┴────────┴──────────┴──────> consistency
```

Every save of an upstream artifact flags the existing downstream artifacts (transitively) as **needs review**. Nothing is silently regenerated. The user then either keeps the downstream artifact ("Still valid") or regenerates it.
