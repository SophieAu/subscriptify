export type TrackResponse = {
  items: {
    added_at: string;
    track: { uri: string };
  }[];
  next: string;
};

export type ErrorResponse = { error: { status: number; message: string } };

export type SnapshotResponse = { snapshot_id: string };
