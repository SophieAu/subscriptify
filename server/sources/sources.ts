import { db } from "../shared/db.ts";
import { getPlaylist } from "../shared/spotify.ts";
import type { Prisma } from "../shared/generated/prisma/client.ts";

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

export const addSource = async (userId: string, spotifyId: string, token: string) => {
  const target = await getActiveTarget();
  if (!target) throw new Error("No target playlist seeded — run `deno task db:seed`");

  const playlist = await getPlaylist(token, spotifyId);
  const data = {
    spotifyId,
    name: playlist.name,
    imageUrl: playlist.images?.[0]?.url ?? null,
    rawJson: playlist as unknown as Prisma.InputJsonValue,
  };

  const source = await db.sourcePlaylist.upsert({
    where: { spotifyId },
    update: data,
    create: data,
  });

  await db.subscription.upsert({
    where: {
      userId_sourceId_targetId: { userId, sourceId: source.id, targetId: target.id },
    },
    update: {},
    create: { userId, sourceId: source.id, targetId: target.id },
  });

  return source;
};

export const removeSource = async (userId: string, sourceId: string) => {
  await db.subscription.deleteMany({ where: { userId, sourceId } });

  const stillSubscribed = await db.subscription.count({ where: { sourceId } });
  if (stillSubscribed === 0) {
    await db.sourcePlaylist.delete({ where: { id: sourceId } });
  }
};
