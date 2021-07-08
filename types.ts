export type TrackResponse = {
  items: Track[];
};

export type ErrorResponse = {
  error: {
    status: number;
    message: string;
  };
};

export type Track = {
  added_at: string;
  track: { uri: string };
};

export type SnapshotResponse = {
  snapshot_id: string;
};
