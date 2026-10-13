# ADR 0001 — SQLite (node:sqlite) with a Postgres-portable schema

**Status:** accepted

**Context.** The repository was empty and no Supabase project or database credentials were available. The app needed to run, and be tested end to end, with zero external services.

**Decision.** Use Node's built-in `node:sqlite` with plain SQL migrations. Ownership is enforced in the API layer: every project-scoped query joins on `user_id`. The schema sticks to portable types (TEXT ids, ISO timestamps, JSON in TEXT) so it maps directly onto Postgres/JSONB.

**Consequences.** No native dependencies and instant tests (`:memory:`). A single instance only. Moving to Supabase/Postgres means porting `server/db.ts` (about 40 lines) and adding RLS policies that mirror the `ownProject` guard. The node:sqlite API still prints an "experimental" warning on Node 22.
