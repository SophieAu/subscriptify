import { accessSpotifyAPI } from "./fetchHelper";
import { Track, ErrorResponse, TrackResponse, SnapshotResponse } from "./types";

const MILLISECONDS_IN_A_MINUTE = 60 * 1000;
const MILLISECONDS_IN_A_DAY = 24 * 60 * MILLISECONDS_IN_A_MINUTE;

const ONE_WEEK = 7 * MILLISECONDS_IN_A_DAY - 5 * MILLISECONDS_IN_A_MINUTE;

const playlistEndoint = (playlistID: string) =>
  `https://api.spotify.com/v1/playlists/${playlistID}/tracks`;

const getTracks = async (playlistID: string): Promise<Track[]> => {
  const uri =
    playlistEndoint(playlistID) +
    "?market=" +
    encodeURIComponent("DE") +
    "&fields=" +
    encodeURIComponent("items(added_at, track.id)");

  try {
    return (await accessSpotifyAPI<TrackResponse>(uri, "GET")).items;
  } catch (e) {}
};

const addTracks = async (playlistID: string, trackIds: string[]) => {
  const uri =
    playlistEndoint(playlistID) +
    "?uris=" +
    encodeURIComponent(trackIds.map((id) => "spotify:track:" + id).join(","));

  try {
    return await accessSpotifyAPI<SnapshotResponse>(uri, "POST");
  } catch (e) {}
};

const addNewTracks = async (sourcePlaylist: string, targetPlaylist: string) => {
  const newTracks = await getTracks(sourcePlaylist);
  const targetListTracks = (await getTracks(targetPlaylist)).map(
    ({ track }) => track.id
  );

  const oneWeekAgo = Date.now() - ONE_WEEK;
  const trackIDs = newTracks
    .filter(({ added_at }) => Date.parse(added_at + "+00:00") > oneWeekAgo)
    .map((track) => track.track.id)
    .filter((id) => !targetListTracks.includes(id));

  addTracks(targetPlaylist, trackIDs);
};
