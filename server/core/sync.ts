import {
  addSongsToPlaylist,
  getSongsForPlaylist,
  getSpotifyTokenForUser,
  getSubscriptionsForUser,
  logSongsAsSeen,
  logSubscriptionsAsSynced,
  refreshSourcePlaylistInfo,
  refreshTargetPlaylistInfo,
} from "./toMoveOut.ts";

export const getGenuinelyNewSongs = (
  potentiallyNewSongs: Iterable<string>,
  tracksCurrentlyInTarget: string[],
  oldTrackIds: string[],
) => {
  const seen = new Set([...tracksCurrentlyInTarget, ...oldTrackIds]);
  return [...new Set(potentiallyNewSongs)].filter((uri) => !seen.has(uri));
};

// What to append to oldTrackIds after a sync: everything now in the target
// (including tracks added outside subscriptify) plus what we just added, minus
// what's already recorded — so a track ever seen in the target is never re-added.
export const getSongsNotLoggedInDB = (
  tracksCurrentlyInTarget: string[],
  addedUris: string[],
  oldTrackIds: string[],
) => {
  const alreadySeen = new Set(oldTrackIds);
  return [...new Set([...tracksCurrentlyInTarget, ...addedUris])].filter((uri) => !alreadySeen.has(uri));
};

export const runSync = async (userId: string) => {
  const token = await getSpotifyTokenForUser(userId);

  const subscriptions = await getSubscriptionsForUser(userId);
  if (subscriptions.length === 0) return { added: 0 };

  const { spotifyId: targetPlaylistSpotifyId, oldTrackIds } = subscriptions[0].target;
  await refreshTargetPlaylistInfo(token, targetPlaylistSpotifyId);
  const tracksCurrentlyInTarget = await getSongsForPlaylist(token, targetPlaylistSpotifyId);

  const potentiallyNewSongs = new Set<string>();
  for (const { source } of subscriptions) {
    await refreshSourcePlaylistInfo(token, source.spotifyId);

    for (const uri of await getSongsForPlaylist(token, source.spotifyId)) {
      potentiallyNewSongs.add(uri);
    }
  }

  const toAddToSpotify = getGenuinelyNewSongs(potentiallyNewSongs, tracksCurrentlyInTarget, oldTrackIds);
  if (toAddToSpotify.length > 0) {
    await addSongsToPlaylist(token, targetPlaylistSpotifyId, toAddToSpotify);
  }

  const newlySeen = getSongsNotLoggedInDB(tracksCurrentlyInTarget, toAddToSpotify, oldTrackIds);
  if (newlySeen.length > 0) {
    await logSongsAsSeen(targetPlaylistSpotifyId, newlySeen);
  }

  await logSubscriptionsAsSynced(subscriptions);
  return { added: toAddToSpotify.length };
};
