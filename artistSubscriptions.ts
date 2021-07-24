import { accessSpotifyAPI } from "./fetchHelper";
import { isLessThanAWeekOld } from "./timeHelpers";
import {
  ReleaseResponse,
  Release,
  AlbumGroup,
  AlbumTracksRespones,
  ArtistResponse,
  Artist,
} from "./types";

export const getNewReleasesFromArtists = async () => {
  const artists = await getFollowedArtists();
  const trackURIs: string[] = [];

  for (const artist of artists) {
    trackURIs.push(...(await getNewReleasesByArtist(artist.id)));
  }

  return trackURIs;
};

const getFollowedArtists = async () => {
  let uri = `https://api.spotify.com/v1/me/following?type=artist`;
  let followedArtists: Artist[] = [];

  while (!!uri) {
    const response = (await accessSpotifyAPI<ArtistResponse>(uri)).artists;

    followedArtists.push(...response.items);

    uri = response.next;
  }

  return followedArtists;
};

const getNewReleasesByArtist = async (id: string) => {
  const singles = await getRelease(id, "single");
  const albums = await getRelease(id, "album");
  const compilations = await getRelease(id, "compilation");
  const features = await getRelease(id, "appears_on");
  const newReleases = [singles, albums, compilations, features].flat();

  return await getTracksWithArtist(id, newReleases);
};

const getRelease = async (artistID: string, group: AlbumGroup) => {
  var queryParams = new URLSearchParams();
  queryParams.append("market", "DE");
  queryParams.append("limit", "10");
  queryParams.append("include_groups", group);

  let uri = `https://api.spotify.com/v1/artists/${artistID}/albums?${queryParams.toString()}`;
  let newReleases: Release[] = [];

  fetchLoop: while (!!uri) {
    const { items, next } = await accessSpotifyAPI<ReleaseResponse>(uri);

    for (const release of items) {
      const { release_date: date, release_date_precision: precision } = release;
      if (!isLessThanAWeekOld(date, precision)) break fetchLoop;

      newReleases.push(release);
    }

    uri = next;
  }

  return newReleases;
};

const getTracksWithArtist = async (artistId: string, releases: Release[]) => {
  var queryParams = new URLSearchParams();
  queryParams.append("ids", releases.map((r) => r.id).join(","));

  let uri = `https://api.spotify.com/v1/albums?${queryParams.toString()}`;
  let newTracks: string[] = [];

  while (!!uri) {
    const response = await accessSpotifyAPI<AlbumTracksRespones>(uri);

    for (const track of response.items) {
      const hasArtist = track.artists.some((a) => a.id === artistId);
      if (hasArtist) newTracks.push(track.uri);
    }

    uri = response.next;
  }

  return newTracks;
};
