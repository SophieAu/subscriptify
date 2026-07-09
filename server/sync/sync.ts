import { db } from "../shared/db.ts";
import {
  addTracksToPlaylist,
  getAllPlaylistTrackUris,
  getSpotifyToken,
} from "../shared/spotify.ts";

export const computeTracksToAdd = (
  sourceUris: Iterable<string>,
  currentTargetUris: string[],
  oldTrackIds: string[],
) => {
  const seen = new Set([...currentTargetUris, ...oldTrackIds]);
  return [...new Set(sourceUris)].filter((uri) => !seen.has(uri));
};

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
    for (const uri of await getAllPlaylistTrackUris(token, source.spotifyId)) {
      sourceUris.add(uri);
    }
  }

  const currentTargetUris = await getAllPlaylistTrackUris(token, target.spotifyId);
  const toAdd = computeTracksToAdd(sourceUris, currentTargetUris, target.oldTrackIds);

  if (toAdd.length > 0) {
    await addTracksToPlaylist(token, target.spotifyId, toAdd);
    await db.targetPlaylist.update({
      where: { id: target.id },
      data: { oldTrackIds: { push: toAdd } },
    });
  }

  await db.subscription.updateMany({
    where: { id: { in: subscriptions.map((s) => s.id) } },
    data: { lastSyncedAt: new Date() },
  });

  return { added: toAdd.length };
};
