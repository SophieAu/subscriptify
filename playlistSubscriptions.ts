import { accessSpotifyAPI } from "./fetchHelper";
import { TrackResponse, SnapshotResponse } from "./types";
import { isLessThanAWeekOld } from "./timeHelpers";

const playlistRequestURL = (playlistID: string, queryParams: URLSearchParams) =>
  `https://api.spotify.com/v1/playlists/${playlistID}/tracks?${queryParams.toString()}`;

const getAllTracks = async (playlistID: string) => {
  var queryParams = new URLSearchParams();
  queryParams.append("market", "DE");
  queryParams.append("fields", "items(added_at, track.id)");

  const uri = playlistRequestURL(playlistID, queryParams);

  try {
    return (await accessSpotifyAPI<TrackResponse>(uri)).items;
  } catch (e) {}
};

const addTracks = async (playlistID: string, trackURIs: string[]) => {
  var queryParams = new URLSearchParams();
  queryParams.append("uris", trackURIs.join(","));

  const uri = playlistRequestURL(playlistID, queryParams);

  try {
    return await accessSpotifyAPI<SnapshotResponse>(uri, "POST");
  } catch (e) {}
};

const getNewTracks = async (playlistID: string) => {
  const tracks = await getAllTracks(playlistID);

  const newTracks = tracks
    .filter(({ added_at }) => isLessThanAWeekOld(added_at))
    .map((track) => track.track.uri);

  const uniqueTracks = [...new Set(newTracks)];
  return uniqueTracks;
};

export const addNewTracks = async (sourcePlaylist: string, targetPlaylist: string) => {
  const newTracks = await getNewTracks(sourcePlaylist);
  const targetListTracks = (await getAllTracks(targetPlaylist)).map(
    ({ track }) => track.uri
  );

  const trackURIs = newTracks.filter((id) => !targetListTracks.includes(id));

  addTracks(targetPlaylist, trackURIs);
};
