// Artist subscriptions — carried over from the old codebase, intentionally left
// commented out until artist sources land (see SPEC.md non-goals).
//
// To revive: uncomment `SourceType` + the `type` field in prisma/schema.prisma,
// then adapt runArtistSync to feed into sync/sync.ts's dedupe/add flow.

// import { spotifyFetch } from "../shared/spotify.ts";

// const API = "https://api.spotify.com/v1";

// type AlbumGroup = "single" | "album" | "compilation" | "appears_on";
// type Artist = { id: string };
// type Release = {
//   id: string;
//   release_date: string;
//   release_date_precision: string;
// };
// type ReleaseResponse = { items: Release[]; next: string | null };
// type ArtistResponse = { artists: { items: Artist[]; next: string | null } };
// type AlbumTracksResponse = {
//   items: { uri: string; artists: { id: string }[] }[];
//   next: string | null;
// };

// const isLessThanAWeekOld = (date: string, _precision?: string) => {
//   const aWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
//   return new Date(date).getTime() > aWeekAgo;
// };

// export const getNewReleasesFromArtists = async (token: string) => {
//   const artists = await getFollowedArtists(token);
//   const trackURIs: string[] = [];

//   for (const artist of artists) {
//     trackURIs.push(...(await getNewReleasesByArtist(token, artist.id)));
//   }

//   return trackURIs;
// };

// const getFollowedArtists = async (token: string) => {
//   let url: string | null = `${API}/me/following?type=artist`;
//   const followedArtists: Artist[] = [];

//   while (url) {
//     const response: ArtistResponse["artists"] =
//       (await spotifyFetch<ArtistResponse>(token, url)).artists;

//     followedArtists.push(...response.items);
//     url = response.next;
//   }

//   return followedArtists;
// };

// const getNewReleasesByArtist = async (token: string, id: string) => {
//   const singles = await getRelease(token, id, "single");
//   const albums = await getRelease(token, id, "album");
//   const compilations = await getRelease(token, id, "compilation");
//   const features = await getRelease(token, id, "appears_on");
//   const newReleases = [singles, albums, compilations, features].flat();

//   return await getTracksWithArtist(token, id, newReleases);
// };

// const getRelease = async (token: string, artistID: string, group: AlbumGroup) => {
//   const queryParams = new URLSearchParams();
//   queryParams.append("market", "DE");
//   queryParams.append("limit", "10");
//   queryParams.append("include_groups", group);

//   let url: string | null = `${API}/artists/${artistID}/albums?${queryParams}`;
//   const newReleases: Release[] = [];

//   fetchLoop: while (url) {
//     const { items, next } = await spotifyFetch<ReleaseResponse>(token, url);

//     for (const release of items) {
//       const { release_date: date, release_date_precision: precision } = release;
//       if (!isLessThanAWeekOld(date, precision)) break fetchLoop;

//       newReleases.push(release);
//     }

//     url = next;
//   }

//   return newReleases;
// };

// const getTracksWithArtist = async (
//   token: string,
//   artistId: string,
//   releases: Release[],
// ) => {
//   const queryParams = new URLSearchParams();
//   queryParams.append("ids", releases.map((r) => r.id).join(","));

//   let url: string | null = `${API}/albums?${queryParams}`;
//   const newTracks: string[] = [];

//   while (url) {
//     const response = await spotifyFetch<AlbumTracksResponse>(token, url);

//     for (const track of response.items) {
//       const hasArtist = track.artists.some((a) => a.id === artistId);
//       if (hasArtist) newTracks.push(track.uri);
//     }

//     url = response.next;
//   }

//   return newTracks;
// };

export {};
