const API = "https://api.spotify.com/v1";
const playlistEndpoint = (playlistId: string) => `${API}/playlists/${playlistId}/tracks`;

export type SpotifyPlaylist = {
  id: string;
  name: string;
  images: { url: string }[] | null;
};
type RawSpotifyPlaylist = SpotifyPlaylist & { items?: unknown; tracks?: { items?: unknown } };

export const spotifyFetch = async <T>(token: string, url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`Spotify ${res.status}: ${await res.text()}`);

  return await res.json();
};

export const getPlaylist = async (token: string, playlistId: string): Promise<SpotifyPlaylist> => {
  const playlist = await spotifyFetch<RawSpotifyPlaylist>(token, `${API}/playlists/${playlistId}`);

  // rawJson keeps the playlist metadata but never the tracklist: the embedded
  // items arrays are ~1MB, tracks are fetched separately at sync time, and that
  // oversized write is what hangs the Neon connection.
  delete playlist.items;
  playlist.tracks && delete playlist.tracks.items;

  return playlist;
};

export const getAllPlaylistTrackUris = async (token: string, playlistId: string) => {
  const uris: string[] = [];
  let url: string | null = `${playlistEndpoint(playlistId)}?limit=100&fields=next,items(track(uri))`;

  while (url) {
    const page: { next: string | null; items: { track: { uri: string } | null }[] } = await spotifyFetch(token, url);
    for (const { track } of page.items) {
      if (track?.uri) uris.push(track.uri);
    }
    url = page.next;
  }

  return uris;
};

export const addTracksToPlaylist = async (token: string, playlistId: string, uris: string[]) => {
  const CHUNK_SIZE = 100;
  for (let i = 0; i < uris.length; i += CHUNK_SIZE) {
    await spotifyFetch(token, playlistEndpoint(playlistId), {
      method: "POST",
      body: JSON.stringify({ uris: uris.slice(i, i + CHUNK_SIZE) }),
    });
  }
};
