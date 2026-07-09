import { clerk } from "./auth.ts";

const API = "https://api.spotify.com/v1";

export type SpotifyPlaylist = {
  id: string;
  name: string;
  images: { url: string }[] | null;
};

export const getSpotifyToken = async (clerkUserId: string) => {
  const tokens = await clerk.users.getUserOauthAccessToken(clerkUserId, "spotify");
  const token = tokens.data[0]?.token;
  if (!token) throw new Error("No Spotify token on the Clerk user");
  return token;
};

export const spotifyFetch = async <T>(
  token: string,
  url: string,
  init?: RequestInit,
): Promise<T> => {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Spotify ${res.status}: ${await res.text()}`);
  return await res.json();
};

export const getPlaylist = (token: string, playlistId: string) =>
  spotifyFetch<SpotifyPlaylist>(token, `${API}/playlists/${playlistId}`);

export const getAllPlaylistTrackUris = async (token: string, playlistId: string) => {
  const uris: string[] = [];
  let url: string | null =
    `${API}/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(uri))`;

  while (url) {
    const page: { next: string | null; items: { track: { uri: string } | null }[] } =
      await spotifyFetch(token, url);
    for (const { track } of page.items) {
      if (track?.uri) uris.push(track.uri);
    }
    url = page.next;
  }

  return uris;
};

export const addTracksToPlaylist = async (
  token: string,
  playlistId: string,
  uris: string[],
) => {
  const CHUNK_SIZE = 100;
  for (let i = 0; i < uris.length; i += CHUNK_SIZE) {
    await spotifyFetch(token, `${API}/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ uris: uris.slice(i, i + CHUNK_SIZE) }),
    });
  }
};
