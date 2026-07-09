# Subscriptify — MVP Spec

Copy songs from one or more **source playlists** into a single **target playlist** on Spotify, skipping any song that is or has ever been in the target. The most MVP of MVPs.

## Stack

| Layer | Choice |
|---|---|
| Runtime / API | Deno + Hono |
| Frontend | Astro (static output) + Svelte islands |
| ORM / DB | Prisma → Neon (Postgres), via `@prisma/adapter-neon` |
| Auth | Clerk, with **Spotify as the social sign-in provider** |
| Hosting | Deno Deploy (single app: Hono serves `/api/*` + the Astro `dist/`) |

## Auth & Spotify access

- Users sign in through Clerk using the Spotify social connection (scopes: `playlist-read-private`, `playlist-modify-public`, `playlist-modify-private`).
- The API verifies the Clerk session token on every `/api/*` request (`@clerk/backend`).
- To call the Spotify API, the backend fetches the user's Spotify access token from Clerk (`users.getUserOauthAccessToken(userId, 'spotify')`) — Clerk stores and refreshes it; no tokens in our DB.
- `/login` uses Clerk's hosted Account Portal (redirect); no custom login UI.

## Pages (2)

1. **`/login`** — redirects to Clerk's hosted sign-in. Signed-in users are redirected to `/`.
2. **`/` (home)** — requires auth (client-side gate: redirect to `/login` if signed out). Shows:
   - The target playlist (read-only; seeded in the DB, no UI to change it)
   - List of source playlists with a delete button each
   - "Add source" input: a Spotify playlist ID, an open.spotify.com link, or a `spotify:playlist:` URI — links/URIs are stripped to the bare ID server-side; no search, no validation beyond "Spotify accepts it"
   - "Sync now" button + last result message (n tracks added / error)

## Functionality

### Sync (core)

`runSync(userId)` — a pure service function, **not** coupled to the HTTP layer, so a Deno Deploy cron can call it later:

1. Load the user's subscriptions (source → target links).
2. Refresh each playlist's stored metadata (`name`, `imageUrl`, `rawJson` — tracklist stripped) for the target and every source from Spotify.
3. Fetch all track URIs from each source playlist (paginated).
4. Fetch all track URIs currently in the target playlist.
5. Compute `seen = current target tracks ∪ target.oldTrackIds` (historical dedupe).
6. Add `sources − seen` to the target via Spotify API (batches of 100).
7. Append the current target tracks **and** the newly added URIs to `target.oldTrackIds` (deduped) — so a track ever present in the target, including ones added outside subscriptify, is never re-added after it's removed.
8. Return `{ added: number }`.

### Source management

- Add source by Spotify playlist ID → creates `SourcePlaylist` (if new) + `Subscription` (user, source, the seeded target).
- Delete removes the subscription (and the source row if no other subscription references it).

## API (Hono, all Clerk-authenticated)

| Route | Action |
|---|---|
| `GET /api/sources` | List the user's subscribed source playlists |
| `POST /api/sources` `{ spotifyId }` | Subscribe to a source playlist |
| `DELETE /api/sources/:id` | Unsubscribe |
| `POST /api/sync` | Run `runSync` for the current user, return `{ added }` |

## DB schema (Prisma)

Note: the `subscriptions Subscription[]` fields below are Prisma **virtual back-relations** — Prisma's validator requires a field on both sides of every relation, but they create **no columns in Postgres**. The only real FK columns are `userId`/`sourceId`/`targetId` on `Subscription`; lookups are plain joins on those.

Backfill-proofing: every table gets `createdAt`/`updatedAt` (impossible to reconstruct later), both playlist tables store the **Spotify playlist JSON** from subscribe time — metadata only, with the tracklist stripped (it's ~1MB of dead weight, hangs the DB write, and tracks are fetched fresh at sync time anyway) so any metadata we didn't think of is still recoverable — and `Subscription` gets `lastSyncedAt` (needed for the future cron, un-backfillable).

```prisma
model User {
  id            String         @id @default(cuid())
  clerkId       String         @unique
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  subscriptions Subscription[]
}

model TargetPlaylist {
  id            String         @id @default(cuid())
  spotifyId     String
  name          String
  imageUrl      String?
  rawJson       Json?          // Spotify playlist metadata at subscribe/seed time (tracklist stripped)
  oldTrackIds   String[]       @default([])  // every track URI ever added
  deletedAt     DateTime?                    // soft-delete: preserves history when re-targeting
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  subscriptions Subscription[]
}

model SourcePlaylist {
  id            String         @id @default(cuid())
  spotifyId     String         @unique
  name          String
  imageUrl      String?
  rawJson       Json?          // Spotify playlist metadata at subscribe time (tracklist stripped)
  // type       SourceType     @default(PLAYLIST)  // uncomment when artist subscriptions land
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  subscriptions Subscription[]
}

// enum SourceType {  // uncomment when artist subscriptions land
//   PLAYLIST
//   ARTIST
// }

model Subscription {
  id           String         @id @default(cuid())
  user         User           @relation(fields: [userId], references: [id])
  userId       String
  source       SourcePlaylist @relation(fields: [sourceId], references: [id])
  sourceId     String
  target       TargetPlaylist @relation(fields: [targetId], references: [id])
  targetId     String
  lastSyncedAt DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@unique([userId, sourceId, targetId])
}
```

- The target playlist is seeded by the seed script — no UI. Only its Spotify id is hardcoded (env var); name, image, and raw JSON are pulled from the Spotify API at seed time, using the signed-in user's Clerk-stored token (so: `db push` → sign in once → `db seed`). Re-running with a different id soft-deletes the old target and creates the new one.
- Re-targeting later = soft-delete the old `TargetPlaylist` row (`deletedAt`), insert a new one; history stays intact.

## Project layout

```
deno.json               # tasks: dev, build, deploy
server/                 # organized by topic, not layer
  main.ts               # Hono app: mounts topic routers + serveStatic(web/dist)
  sources/
    routes.ts           # GET/POST/DELETE /api/sources
    sources.ts          # subscribe/unsubscribe logic
  sync/
    routes.ts           # POST /api/sync
    sync.ts             # runSync — cron-callable later
  artists/
    artistSync.ts       # old artistSubscriptions.ts logic, fully commented out
  shared/
    spotify.ts          # token via Clerk, paginated fetch, batched add
    auth.ts             # Clerk session middleware
    db.ts               # Prisma client + Neon adapter
prisma.config.ts        # Prisma 7 CLI config (connection URL lives here, not in the schema)
prisma/
  schema.prisma
  seed.ts               # hydrates the hardcoded target id from the Spotify API
web/                    # Astro project (static output)
  src/pages/index.astro
  src/pages/login.astro
  src/components/*.svelte
```

## Non-goals (explicitly out of scope)

- Artist subscriptions — not active in the MVP; the old logic is carried over **commented out** in `server/artists/artistSync.ts`, with the matching schema bits commented in `schema.prisma`
- Playlist search / browse / metadata display
- Multiple targets or target management UI
- Cron scheduling (designed for, not built)
- Unplayable-track filtering, time-window filtering
- Any error handling beyond surfacing "sync failed"
