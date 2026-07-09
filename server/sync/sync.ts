import { db } from "../shared/db.ts";
import {
  addTracksToPlaylist,
  getAllPlaylistTrackUris,
  getPlaylist,
  getSpotifyToken,
  type SpotifyPlaylist,
} from "../shared/spotify.ts";
import type { Prisma } from "../shared/generated/prisma/client.ts";

export const computeTracksToAdd = (
  sourceUris: Iterable<string>,
  currentTargetUris: string[],
  oldTrackIds: string[],
) => {
  const seen = new Set([...currentTargetUris, ...oldTrackIds]);
  return [...new Set(sourceUris)].filter((uri) => !seen.has(uri));
};

// What to append to oldTrackIds after a sync: everything now in the target
// (including tracks added outside subscriptify) plus what we just added, minus
// what's already recorded — so a track ever seen in the target is never re-added.
export const computeNewlySeenUris = (
  currentTargetUris: string[],
  addedUris: string[],
  oldTrackIds: string[],
) => {
  const alreadySeen = new Set(oldTrackIds);
  return [...new Set([...currentTargetUris, ...addedUris])].filter((uri) => !alreadySeen.has(uri));
};

export const playlistMetadataFields = (spotifyPlaylist: SpotifyPlaylist) => ({
  name: spotifyPlaylist.name,
  imageUrl: spotifyPlaylist.images?.[0]?.url ?? null,
  rawJson: spotifyPlaylist as unknown as Prisma.InputJsonValue,
});

export const runSync = async (userId: string) => {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const token = await getSpotifyToken(user.clerkId);

  const subscriptions = await db.subscription.findMany({
    where: { userId, target: { deletedAt: null } },
    include: { source: true, target: true },
  });
  if (subscriptions.length === 0) return { added: 0 };

  const target = subscriptions[0].target;

  const sourceUris = new Set<string>();
  for (const { source } of subscriptions) {
    await db.sourcePlaylist.update({
      where: { id: source.id },
      data: playlistMetadataFields(await getPlaylist(token, source.spotifyId)),
    });
    for (const uri of await getAllPlaylistTrackUris(token, source.spotifyId)) {
      sourceUris.add(uri);
    }
  }

  await db.targetPlaylist.update({
    where: { id: target.id },
    data: playlistMetadataFields(await getPlaylist(token, target.spotifyId)),
  });
  const currentTargetUris = await getAllPlaylistTrackUris(token, target.spotifyId);
  const toAdd = computeTracksToAdd(sourceUris, currentTargetUris, target.oldTrackIds);
  const newlySeen = computeNewlySeenUris(currentTargetUris, toAdd, target.oldTrackIds);

  if (toAdd.length > 0) {
    await addTracksToPlaylist(token, target.spotifyId, toAdd);
  }

  if (newlySeen.length > 0) {
    await db.targetPlaylist.update({
      where: { id: target.id },
      data: { oldTrackIds: { push: newlySeen } },
    });
  }

  await db.subscription.updateMany({
    where: { id: { in: subscriptions.map((s) => s.id) } },
    data: { lastSyncedAt: new Date() },
  });

  return { added: toAdd.length };
};
