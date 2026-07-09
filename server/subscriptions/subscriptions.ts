import { db } from "../shared/db.ts";
import type { Prisma } from "../shared/generated/prisma/client.ts";
import { getPlaylist } from "../shared/spotify.ts";


type SubscriptionContext = {
  userId: string;
  spotifyToken: string;
};

export const getActiveTarget = () =>
  db.targetPlaylist.findFirst({ where: { deletedAt: null } });

export const listSources = async (userId: string) => {
  const subscriptions = await db.subscription.findMany({
    where: { userId },
    include: { source: true },
    orderBy: { createdAt: "asc" },
  });

  return subscriptions.map(({ source }) => ({
    id: source.id,
    spotifyId: source.spotifyId,
    name: source.name,
    imageUrl: source.imageUrl,
  }));
};

const addNewSubscription = async (
  context: SubscriptionContext,
  sourcePlaylistSpotifyId: string,
  targetPlaylistSpotifyId: string,
) => {
  const targetPlaylist = await db.targetPlaylist.findFirst({
    where: { spotifyId: targetPlaylistSpotifyId, deletedAt: null },
  });
  if (!targetPlaylist) {
    throw new Error(`No active target playlist with Spotify id ${targetPlaylistSpotifyId}`);
  }

  const spotifySourcePlaylist = await getPlaylist(context.spotifyToken, sourcePlaylistSpotifyId);
  const sourcePlaylistData = {
    spotifyId: sourcePlaylistSpotifyId,
    name: spotifySourcePlaylist.name,
    imageUrl: spotifySourcePlaylist.images?.[0]?.url ?? null,
    rawJson: spotifySourcePlaylist as unknown as Prisma.InputJsonValue,
  };

  const sourcePlaylist = await db.sourcePlaylist.upsert({
    where: { spotifyId: sourcePlaylistSpotifyId },
    update: sourcePlaylistData,
    create: sourcePlaylistData,
  });

  await db.subscription.upsert({
    where: {
      userId_sourceId_targetId: {
        userId: context.userId,
        sourceId: sourcePlaylist.id,
        targetId: targetPlaylist.id,
      },
    },
    update: {},
    create: {
      userId: context.userId,
      sourceId: sourcePlaylist.id,
      targetId: targetPlaylist.id,
    },
  });

  return sourcePlaylist;
};

export const addSource = async (userId: string, spotifyId: string, token: string) => {
  const target = await getActiveTarget();
  if (!target) throw new Error("No target playlist seeded — run `deno task db:seed`");

  return addNewSubscription({ userId, spotifyToken: token }, spotifyId, target.spotifyId);
};

export const removeSource = async (userId: string, sourceId: string) => {
  await db.subscription.deleteMany({ where: { userId, sourceId } });

  const stillSubscribed = await db.subscription.count({ where: { sourceId } });
  if (stillSubscribed === 0) {
    await db.sourcePlaylist.delete({ where: { id: sourceId } });
  }
};
