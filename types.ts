export type TrackResponse = {
  items: {
    added_at: string;
    track: { uri: string };
  }[];
  next: string;
};

export type ErrorResponse = { error: { status: number; message: string } };

export type SnapshotResponse = { snapshot_id: string };

export type Release = {
  album_group: AlbumGroup;
  album_type: "album" | "single" | "compilation";
  id: string;
  release_date: string;
  release_date_precision: DatePrecision;
};

export type DatePrecision = "day" | "month" | "year" | "second";

export type AlbumGroup = "album" | "single" | "appears_on" | "compilation";

export type ReleaseResponse = PaginatedReponse<Release>;

export type AlbumTracksRespones = PaginatedReponse<{
  artists: Artist[];
  uri: string;
}>;

export type ArtistResponse = {
  artists: {
    items: Artist[];
    next: string;
  };
};

type PaginatedReponse<T> = {
  items: T[];
  next: string;
};

export type Artist = { id: string };
