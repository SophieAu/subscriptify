# TODO

## Backlog

- [ ] Clean up code
- [ ] Add better logging
- [ ] Add Axiom logging
- [ ] Use custom URL
- [ ] Add artist subscriptions (pre-sketch exists in `server/artists/artistSync.ts`)
- [ ] Make frontend prettier
- [ ] Add landing page
- [ ] Add error handling (esp. around Spotify-created playlists — the Nov 2024 API lockdown makes Release Radar / Discover Weekly / editorial playlists fail)
- [ ] Add cron job (`runSync` is already decoupled from HTTP for this; `Subscription.lastSyncedAt` exists for it)
- [ ] Check project notes for anything else
- [ ] Use Clerk production instance
- [ ] UI
- [ ] Better error handling (when api errors, when session has run out)
- [ ] Loading states

## Suggested (Claude)

- [ ] Seen-tracks migration: replace `oldTrackIds` array with `SeenTrack` relation — full plan in `docs/seen-tracks-migration-plan.md`
- [ ] Resolve the CLAUDE.md "candidate rules": lazy/factory client construction (would remove the `.env.test` dummy-values hack), `App.svelte` → TypeScript, no `as unknown as` double casts
- [ ] Multi-target support (or explicitly commit to single-target): `runSync` only syncs `subscriptions[0].target`
- [ ] Update SPEC.md alongside whichever of the above change behavior (spec-driven repo)
