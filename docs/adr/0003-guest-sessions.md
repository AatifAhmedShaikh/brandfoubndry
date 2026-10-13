# ADR 0003 — Guest sessions instead of auth-first

**Status:** accepted

**Decision.** The landing page, project creation and the demo never require an account. The first write creates a guest user with a normal session cookie, so the same persistence and ownership code paths are used. Registering converts the guest in place. Signing in to an existing account moves the guest's projects into it. Inactive guests are purged after 30 days.

**Trade-off.** Anonymous rows accumulate until they are purged. Rate limiting applies per user, guest or not.
