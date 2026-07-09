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
const targetPlaylist = await getPlaylist(token, spotifyId);
const targetPlaylistData = {
  spotifyId,
  name: targetPlaylist.name,
  imageUrl: targetPlaylist.images?.[0]?.url ?? null,
  rawJson: targetPlaylist as unknown as Prisma.InputJsonValue,
};

const currentlyActiveTargetPlaylist = await db.targetPlaylist.findFirst({ where: { deletedAt: null } });

if (!currentlyActiveTargetPlaylist) {
  await db.targetPlaylist.create({ data: targetPlaylistData });
  console.log(`Seeded target playlist: ${targetPlaylist.name} (${spotifyId})`);
} else {
  if (currentlyActiveTargetPlaylist.spotifyId !== spotifyId) {
    await db.targetPlaylist.update({ where: { id: currentlyActiveTargetPlaylist.id }, data: { deletedAt: new Date() } });
    console.log(`Re-targeting: soft-deleted previous target ${currentlyActiveTargetPlaylist.name} (${currentlyActiveTargetPlaylist.spotifyId})`);

    await db.targetPlaylist.create({ data: targetPlaylistData });
    console.log(`Seeded target playlist: ${targetPlaylist.name} (${spotifyId})`);
  }

  else {
    await db.targetPlaylist.update({ where: { id: currentlyActiveTargetPlaylist.id }, data: targetPlaylistData });
    console.log(`Refreshed target playlist: ${targetPlaylist.name} (${spotifyId})`);
  }
}