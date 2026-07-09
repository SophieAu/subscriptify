import { db } from "../server/shared/db.ts";
import type { Prisma } from "../server/shared/generated/prisma/client.ts";
import { getPlaylist, getSpotifyToken } from "../server/shared/spotify.ts";

const spotifyId = Deno.env.get("TARGET_PLAYLIST_SPOTIFY_ID");
if (!spotifyId) throw new Error("TARGET_PLAYLIST_SPOTIFY_ID is not set");

// The Spotify token comes from Clerk, so someone must have signed in first.
const user = await db.user.findFirst();
if (!user) {
  throw new Error("No user in the db yet — sign in through the app once, then re-run the seed");
}

const token = await getSpotifyToken(user.clerkId);
const playlist = await getPlaylist(token, spotifyId);
const data = {
  spotifyId,
  name: playlist.name,
  imageUrl: playlist.images?.[0]?.url ?? null,
  rawJson: playlist as unknown as Prisma.InputJsonValue,
};

const active = await db.targetPlaylist.findFirst({ where: { deletedAt: null } });

if (active && active.spotifyId === spotifyId) {
  await db.targetPlaylist.update({ where: { id: active.id }, data });
  console.log(`Refreshed target playlist: ${playlist.name} (${spotifyId})`);
} else {
  if (active) {
    await db.targetPlaylist.update({
      where: { id: active.id },
      data: { deletedAt: new Date() },
    });
    console.log(`Re-targeting: soft-deleted previous target ${active.name} (${active.spotifyId})`);
  }
  await db.targetPlaylist.create({ data });
  console.log(`Seeded target playlist: ${playlist.name} (${spotifyId})`);
}
