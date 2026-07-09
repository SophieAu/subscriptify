import { getSpotifyToken } from "../shared/auth.ts";
import { db } from "../shared/db.ts";
import { Prisma, Subscription } from "../shared/generated/prisma/client.ts";
import { addTracksToPlaylist, getAllPlaylistTrackUris, getPlaylist, SpotifyPlaylist } from "../shared/spotify.ts";

export const playlistMetadataFields = (spotifyPlaylist: SpotifyPlaylist) => ({
  name: spotifyPlaylist.name,
  imageUrl: spotifyPlaylist.images?.[0]?.url ?? null,
  rawJson: spotifyPlaylist as unknown as Prisma.InputJsonValue,
});

export const getSpotifyTokenForUser = async (userId: string) => {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  return await getSpotifyToken(user.clerkId);
};

export const getSubscriptionsForUser = async (userId: string) =>
  await db.subscription.findMany({
    where: { userId, target: { deletedAt: null } },
    include: { source: true, target: true },
  });

export const refreshPlaylistInfo = async (token: string, spotifyId: string) => {
  await db.sourcePlaylist.update({
    where: { spotifyId },
    data: playlistMetadataFields(await getPlaylist(token, spotifyId)),
  });
};

export const getSongsForPlaylist = async (token: string, spotifyId: string) =>
  await getAllPlaylistTrackUris(token, spotifyId);

export const addSongsToPlaylist = async (token: string, targetPlaylistSpotifyId: string, songsToAdd: string[]) =>
  await addTracksToPlaylist(token, targetPlaylistSpotifyId, songsToAdd);

export const logSongsAsSeen = async (spotifyId: string, newlySeen: string[]) =>
  await db.targetPlaylist.update({
    where: { spotifyId },
    data: { oldTrackIds: { push: newlySeen } },
  });

export const logSubscriptionsAsSynced = async (subscriptions: Subscription[]) =>
  await db.subscription.updateMany({
    where: { id: { in: subscriptions.map((s) => s.id) } },
    data: { lastSyncedAt: new Date() },
  });
