import { accessSpotifyAPI } from "./fetchHelper";
import { TrackResponse, SnapshotResponse } from "./types";
import { isLessThanAWeekOld } from "./timeHelpers";
import { getNewReleasesFromArtists } from "./artistSubscriptions";

export const addNewTracks = async (
  sourcePlaylist: string,
  targetPlaylist: string
) => {
  const newTracks = await getNewTracks(sourcePlaylist);
  const targetListTracks = (await getAllTracks(targetPlaylist)).map(
    ({ track }) => track.uri
  );

  const trackURIs = newTracks.filter((id) => !targetListTracks.includes(id));

  addTracks(targetPlaylist, trackURIs);
};

export const addNewArtistsTracks = async (targetPlaylist: string) => {
  const newTracks = await getNewReleasesFromArtists();
  const targetListTracks = (await getAllTracks(targetPlaylist)).map(
    ({ track }) => track.uri
  );
  const trackURIs = newTracks.filter((id) => !targetListTracks.includes(id));
  console.log("adding: ");
  console.log(trackURIs);

  addTracks(targetPlaylist, trackURIs);
};

const playlistRequestURL = (
  playlistID: string,
  queryParams?: URLSearchParams
) => {
  const base = `https://api.spotify.com/v1/playlists/${playlistID}/tracks`;
  const params = queryParams ? `?${queryParams.toString()}` : "";

  return base + params;
};

const getAllTracks = async (playlistID: string) => {
  var queryParams = new URLSearchParams();
  queryParams.append("market", "DE");
  queryParams.append("fields", "items(added_at, track.uri)");

  const uri = playlistRequestURL(playlistID, queryParams);

  return (await accessSpotifyAPI<TrackResponse>(uri)).items;
};

const addTracks = async (playlistID: string, trackURIs: string[]) => {
  const chunkedTracks: string[] = [];
  const CHUNK_SIZE = 100;
  let index = 0;
  while (index < trackURIs.length) {
    chunkedTracks.push(...trackURIs.slice(index, CHUNK_SIZE + index));
    index += CHUNK_SIZE;
  }

  const uri = playlistRequestURL(playlistID);
  const responses: SnapshotResponse[] = [];
  for (const tracks of chunkedTracks) {
    await accessSpotifyAPI<SnapshotResponse>(uri, "POST", { uris: tracks });
  }
  return responses;
};

const getNewTracks = async (playlistID: string) => {
  const tracks = await getAllTracks(playlistID);

  const newTracks = tracks
    .filter(({ added_at }) => isLessThanAWeekOld(added_at))
    .map((track) => track.track.uri);

  const uniqueTracks = [...new Set(newTracks)];
  return uniqueTracks;
};
