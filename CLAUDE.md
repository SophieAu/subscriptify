# Subscriptify conventions

Spec-driven development: `SPEC.md` is the source of truth. If a change alters behavior, update the spec in the same change.

## Code style

- Names carry their full role, even when that makes them long: `targetPlaylistData`, not `data`; `currentlyActiveTargetPlaylist`, not `active`. Never use generic names (`data`, `result`, `item`, `active`, `info`).
- In conditionals, handle the empty/absent case first, then the variants of the existing case.
- Organize by topic, not by layer: a feature folder owns its routes and logic (`server/subscriptions/`, `server/sync/`). Only genuinely cross-cutting infrastructure (db client, auth middleware, Spotify client) lives in `server/shared/`.
- Routes: handlers are named exports in the topic's `routes.ts` (`getSourcePlaylist`, `addSourcePlaylist`, `removeSourcePlaylist` — typed `Context<AuthEnv>` or `Context<AuthEnv, "/:param">`); ALL wiring (paths, methods, middleware, mounting) lives in `server/main.ts` so every route is visible in one place. A trivial one-liner handler may be inlined in `main.ts` instead of getting a `routes.ts`.
- Request bodies are validated with `hono/validator` middleware, not inside handlers: export the validator next to its handler (`validateAddSourcePlaylist`), wire it before the handler in `main.ts`, and type the handler as `Context<AuthEnv, Path, ValidatorInput<typeof theValidator>>` (helper in `server/shared/validation.ts`) so the body type is inferred from the validator and cannot diverge from it.

## Workflow

- A change isn't done until logic has tests. `deno task test` runs them; typecheck with `deno task check`.
- Look up current package versions from the registry before pinning — never pin from memory. Respect the Deno dependency cooldown: if a version is too new, pin the newest one that clears it, and say so.
- Before changing dependencies, versions, or config, say what is being changed and why *first*. Never silently adjust around a setting that may be deliberate (version pins, security settings, lockfiles) — ask.

## Candidate rules (Sophie: confirm or delete)

- No `as unknown as` double casts — restructure types instead.
- No module-level client construction (`db`, `clerk` are currently built at import time, which is why tests need `.env.test` with dummy values). Prefer lazy/factory construction.
- `App.svelte` should be TypeScript like the server code, not untyped JS.
- No thrown bare `Error`s for expected failure cases — but this MVP explicitly keeps error handling minimal, so maybe later.
