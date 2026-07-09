import { db } from "../server/shared/db.ts";
import type { Prisma } from "../server/shared/generated/prisma/client.ts";
import { getPlaylist, getSpotifyToken } from "../server/shared/spotify.ts";


const TARGET_PLAYLIST_SPOTIFY_ID = "4BDYS0S4CYFKAQvwaKYN40"


// The Spotify token comes from Clerk, so someone must have signed in first.
const user = await db.user.findFirst();
if (!user) {
  throw new Error("No user in the db yet — sign in through the app once, then re-run the seed");
}

const token = await getSpotifyToken(user.clerkId);
const targetPlaylist = await getPlaylist(token, TARGET_PLAYLIST_SPOTIFY_ID);
const targetPlaylistData = {
  spotifyId: TARGET_PLAYLIST_SPOTIFY_ID,
  name: targetPlaylist.name,
  imageUrl: targetPlaylist.images?.[0]?.url ?? null,
  rawJson: targetPlaylist as unknown as Prisma.InputJsonValue,
};

const currentlyActiveTargetPlaylist = await db.targetPlaylist.findFirst({ where: { deletedAt: null } });

if (!currentlyActiveTargetPlaylist) {
  await db.targetPlaylist.create({ data: targetPlaylistData });
  console.log(`Seeded target playlist: ${targetPlaylist.name} (${TARGET_PLAYLIST_SPOTIFY_ID})`);
} else {
  if (currentlyActiveTargetPlaylist.spotifyId !== TARGET_PLAYLIST_SPOTIFY_ID) {
    await db.targetPlaylist.update({ where: { id: currentlyActiveTargetPlaylist.id }, data: { deletedAt: new Date() } });
    console.log(`Re-targeting: soft-deleted previous target ${currentlyActiveTargetPlaylist.name} (${currentlyActiveTargetPlaylist.spotifyId})`);

    await db.targetPlaylist.create({ data: targetPlaylistData });
    console.log(`Seeded target playlist: ${targetPlaylist.name} (${TARGET_PLAYLIST_SPOTIFY_ID})`);
  }

  else {
    await db.targetPlaylist.update({ where: { id: currentlyActiveTargetPlaylist.id }, data: targetPlaylistData });
    console.log(`Refreshed target playlist: ${targetPlaylist.name} (${TARGET_PLAYLIST_SPOTIFY_ID})`);
  }
}