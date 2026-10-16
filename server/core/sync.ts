import { logger } from "../adapters/logging.ts";
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

  // 1. get subscriptions
  const subscriptions = await getSubscriptionsForUser(userId);
  if (subscriptions.length === 0) return { added: 0 };
  logger.info({ subscriptions: subscriptions.length });

  // 2. refresh targetplaylist (since it could have changed since last sync with db)
  const { spotifyId: targetPlaylistSpotifyId, oldTrackIds } = subscriptions[0].target;
  await refreshTargetPlaylistInfo(token, targetPlaylistSpotifyId);
  const tracksCurrentlyInTarget = await getSongsForPlaylist(token, targetPlaylistSpotifyId);
  logger.info("target playlist updated");

  // 3. get all new songs for all subscribed playlists
  const songsPerSourcePlaylist = await Promise.all(
    subscriptions.map(async ({ source }) => {
      await refreshSourcePlaylistInfo(token, source.spotifyId);
      logger.info(`source playlist '${source.name} updated`);

      const songsForSourcePlaylist = await getSongsForPlaylist(token, source.spotifyId);
      logger.info(`songs for '${source.name} extracted`);

      return songsForSourcePlaylist;
    }),
  );
  const potentiallyNewSongs = new Set(songsPerSourcePlaylist.flat());

  // 4. add songs to target list
  const toAddToSpotify = getGenuinelyNewSongs(potentiallyNewSongs, tracksCurrentlyInTarget, oldTrackIds);
  if (toAddToSpotify.length > 0) {
    await addSongsToPlaylist(token, targetPlaylistSpotifyId, toAddToSpotify);
  }
  logger.info("New songs added");

  // 5. log new songs to db
  const newlySeen = getSongsNotLoggedInDB(tracksCurrentlyInTarget, toAddToSpotify, oldTrackIds);
  if (newlySeen.length > 0) {
    await logSongsAsSeen(targetPlaylistSpotifyId, newlySeen);
  }
  logger.info("New songs added");

  await logSubscriptionsAsSynced(subscriptions);
  return { added: toAddToSpotify.length };
};
