# ADR 0004 — Server-side AI with structured outputs

**Status:** accepted

**Decision.** All AI calls go through `server/ai.ts` (Anthropic SDK, `beta.messages.parse` with Zod output formats, adaptive thinking, `medium` effort, server-side refusal fallback on supported models). Task code in `server/tasks.ts` builds prompts from approved upstream artifacts only, clamps and re-validates output, and saves it as a new version with provenance. The provider is injected, so tests use a fake.

**Not done.** No streaming to the UI (outputs are small structured objects), and no live web research (no source can be verified without a configured search integration).
