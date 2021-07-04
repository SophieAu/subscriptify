import { accessSpotifyAPI } from "./fetchHelper";
import { Track, TrackResponse, SnapshotResponse } from "./types";

const MILLISECONDS_IN_A_MINUTE = 60 * 1000;
const ONE_WEEK = 7 * 24 * 60 * MILLISECONDS_IN_A_MINUTE;

const playlistRequestURL = (playlistID: string, queryParams: URLSearchParams) =>
  `https://api.spotify.com/v1/playlists/${playlistID}/tracks?${queryParams.toString()}`;

const getTracks = async (playlistID: string): Promise<Track[]> => {
  var queryParams = new URLSearchParams();
  queryParams.append("market", "DE");
  queryParams.append("fields", "items(added_at, track.id)");

  const uri = playlistRequestURL(playlistID, queryParams);

  try {
    return (await accessSpotifyAPI<TrackResponse>(uri, "GET")).items;
  } catch (e) {}
};

const addTracks = async (playlistID: string, trackIds: string[]) => {
  const preparedTrackIds = trackIds.map((id) => "spotify:track:" + id);

  var queryParams = new URLSearchParams();
  queryParams.append("uris", preparedTrackIds.join(","));

  const uri = playlistRequestURL(playlistID, queryParams);

  try {
    return await accessSpotifyAPI<SnapshotResponse>(uri, "POST");
  } catch (e) {}
};

const addNewTracks = async (sourcePlaylist: string, targetPlaylist: string) => {
  const newTracks = await getTracks(sourcePlaylist);
  const targetListTracks = (await getTracks(targetPlaylist)).map(
    ({ track }) => track.id
  );

  const oneWeekAgo = Date.now() - ONE_WEEK - 5 * MILLISECONDS_IN_A_MINUTE; // with a buffer because I don't trust computers
  const trackIDs = newTracks
    .filter(({ added_at }) => Date.parse(added_at + "+00:00") > oneWeekAgo)
    .map((track) => track.track.id)
    .filter((id) => !targetListTracks.includes(id));

  addTracks(targetPlaylist, trackIDs);
};
