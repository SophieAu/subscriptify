# Seen-tracks: array → relation

Plan for replacing `TargetPlaylist.oldTrackIds` (a `String[]` column) with a
`SeenTrack` relation. Written up so it can be picked up cold.

## Why

`oldTrackIds` is "every track URI **ever** added" — it grows without bound as
tracks cycle in and out of the playlist (the Spotify 10k playlist cap is *not*
a ceiling on it). It's already at ~10k. Consequences on every single sync:

- **Read**: `getSubscriptionsForUser` includes the target, pulling the whole
  array into memory just to build the `seen` Set. ~370KB loaded per sync,
  growing forever.
- **Write**: `logSongsAsSeen` uses `{ oldTrackIds: { push: ... } }`. The push
  itself compiles to a server-side `array_cat` (not a client-side rewrite), but
  Postgres is MVCC + stores the array inline, so the *whole row* is rewritten to
  a new tuple every sync regardless. Write amplification grows with history.

`push` isn't the bug — the data model is. Promote seen-tracks to their own
table so appends are index inserts and reads only touch the slice that matters.

## Schema

```prisma
model SeenTrack {
  targetPlaylist   TargetPlaylist @relation(fields: [targetPlaylistId], references: [id], onDelete: Cascade)
  targetPlaylistId String
  uri              String
  createdAt        DateTime @default(now())

  @@id([targetPlaylistId, uri])   // composite PK doubles as the dedup index
}
```

Add the back-relation `seenTracks SeenTrack[]` to `TargetPlaylist`, and
eventually remove `oldTrackIds` from it (see migration Step 5).

## Sync logic — the `seenKnown` insight

Current set math (in `sync.ts`):

```
toAdd     = sources − currentTarget − oldTrackIds        // computeTracksToAdd
newlySeen = (currentTarget ∪ added) − oldTrackIds        // computeNewlySeenUris
```

where `sources` = union of source-playlist URIs, `currentTarget` = URIs in the
target right now (from Spotify), `oldTrackIds` = full seen history from DB.

**Key observation:** `oldTrackIds` only ever appears on the right of a `−`,
subtracted from things built out of `sources` and `currentTarget`. So any
element of the history that is *not* in `sources ∪ currentTarget` can never
change either result. Define:

```
seenKnown = seenDB ∩ (sources ∪ currentTarget)
```

Then, provably:

```
sources − currentTarget − seenDB          ≡  sources − currentTarget − seenKnown
(currentTarget ∪ added) − seenDB          ≡  (currentTarget ∪ added) − seenKnown
```

Identical outputs. The ~9,900 historical URIs not in any current source or the
current target were dead weight in the computation — loaded for nothing.

### What changes in code

- The two pure functions `computeTracksToAdd(sources, currentTarget, seenKnown)`
  and `computeNewlySeenUris(currentTarget, added, seenKnown)` stay **unchanged**,
  same signatures — just fed `seenKnown` instead of the full array. **Their
  tests stay as-is.**
- Read side: drop `oldTrackIds` from the target include; instead query only the
  candidates:
  ```ts
  const candidateUris = [...new Set([...sources, ...currentTarget])];
  const seenKnown = new Set(
    (await db.seenTrack.findMany({
      where: { targetPlaylistId, uri: { in: candidateUris } },
      select: { uri: true },
    })).map((r) => r.uri),
  );
  ```
  Memory + query size now scale with `|sources| + |currentTarget|`, not history.
- Write side: `logSongsAsSeen` swaps `push` for an insert of just the diff
  (`newlySeen` is already `(currentTarget ∪ added) − seenKnown`):
  ```ts
  await db.seenTrack.createMany({
    data: newlySeen.map((uri) => ({ targetPlaylistId, uri })),
    skipDuplicates: true,   // belt-and-suspenders vs. a concurrent sync
  });
  ```

Net: read touches a bounded slice; write inserts only the handful of new-to-
history rows against an index. No full-array load, no full-row rewrite.

## Migration strategy — additive first, destructive last

Governing rule: **`oldTrackIds` stays the source of truth until the backfill is
verified.** Everything before the final step is reversible by just not
continuing. Repo uses `prisma db push` (no migration files) on Neon serverless
(over-fetch driver) — hence the chunking below.

### Step 1 — additive push (safe, reversible)
Add `SeenTrack` to the schema, **keep `oldTrackIds`**.
```
deno task db:push      # purely additive: new table + PK, no data-loss prompt
deno task db:generate  # client learns about db.seenTrack
```

### Step 2 — backfill (idempotent, chunked; throwaway script, don't commit)
Copy the array into rows for **every** `TargetPlaylist`, including soft-deleted
ones (they still hold history):
```ts
for (const target of await db.targetPlaylist.findMany()) {   // no deletedAt filter
  const uris = [...new Set(target.oldTrackIds)];
  for (let i = 0; i < uris.length; i += 1000) {              // chunk for the Neon fetch driver
    await db.seenTrack.createMany({
      data: uris.slice(i, i + 1000).map((uri) => ({ targetPlaylistId: target.id, uri })),
      skipDuplicates: true,
    });
  }
}
```
Idempotent (skipDuplicates + composite PK) — safe to re-run if it dies halfway.

### Step 3 — verify (the gate)
Per target, assert `new Set(oldTrackIds).size === seenTrack.count({ where: { targetPlaylistId } })`.
Must match for **every** target. If not, stop — the column is intact, nothing lost.

### Step 4 — deploy the new sync code
Swap `sync.ts` / `toMoveOut.ts` to the `seenKnown` read + `createMany` write.
New code doesn't reference `oldTrackIds`, so it runs fine while the column still
exists. Run a real sync, confirm behavior.

### Step 5 — destructive push (drop the column)
Only now remove `oldTrackIds` from the schema.
```
deno task db:push --accept-data-loss   # the flagged column drop is intended
deno task db:generate
```

### Ordering caveat
Between Step 2 and Step 5, **don't run a sync on the old code** — it would
`push` new URIs onto `oldTrackIds` that the backfill already passed, and they'd
be lost at the drop. Sync is manual + single-user, so this is just "don't sync
in the gap," moot once Step 4 ships.

### Safety net
`oldTrackIds` *is* the backup through Step 4 (untouched). Before Step 5, a Neon
branch snapshot (or a two-line dump of `id, oldTrackIds`) covers the drop.

## Also update

- **`SPEC.md`**: steps 5 & 7 of the Sync section, and the `TargetPlaylist`
  schema block — describe `SeenTrack` instead of the `oldTrackIds` array.
- **Tests** (`sync.test.ts`): the pure-function tests are unchanged. No new
  tests strictly required by the logic, but a small check that the `seenKnown`
  query wiring passes the right subset would be nice-to-have.
- **Seed** (`prisma/seed.ts`): no change needed — it never writes `oldTrackIds`
  (relied on `@default([])`).
- **`updatedAt` on `TargetPlaylist`**: no longer moves on sync (we stop writing
  to the row). This is fine — it never meant "playlist updated" — just noted.
