import type { Context } from "hono";
import { validator } from "hono/validator";
import type { AuthEnv } from "../shared/auth.ts";
import { getSpotifyToken } from "../shared/spotify.ts";
import type { ValidatorInput } from "../shared/validation.ts";
import {
  addSource,
  getActiveTarget,
  getLastSyncedAt,
  listSources,
  removeSource,
} from "./subscriptions.ts";

// Accepts a bare playlist id, an open.spotify.com link (with optional
// /intl-xx/ locale prefix and ?si=… query), or a spotify:playlist: URI,
// and returns just the id.
const extractSpotifyPlaylistId = (rawSpotifyInput: string): string => {
  const uriMatch = rawSpotifyInput.match(/spotify:playlist:([A-Za-z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  const urlMatch = rawSpotifyInput.match(/\/playlist\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  return rawSpotifyInput;
};

export const validateAddSourcePlaylist = validator("json", (body: Record<string, unknown>, c) => {
  const rawSpotifyInput = typeof body.spotifyId === "string" ? body.spotifyId.trim() : "";
  if (!rawSpotifyInput) return c.json({ error: "spotifyId is required" }, 400);
  return { spotifyId: extractSpotifyPlaylistId(rawSpotifyInput) };
});

export const getSourcePlaylist = async (c: Context<AuthEnv>) => {
  const [target, sources, lastSyncedAt] = await Promise.all([
    getActiveTarget(),
    listSources(c.get("userId")),
    getLastSyncedAt(c.get("userId")),
  ]);
  return c.json({
    target: target && {
      spotifyId: target.spotifyId,
      name: target.name,
      imageUrl: target.imageUrl,
    },
    sources,
    lastSyncedAt,
  });
};

export const addSourcePlaylist = async (
  c: Context<AuthEnv, "/", ValidatorInput<typeof validateAddSourcePlaylist>>,
) => {
  const { spotifyId } = c.req.valid("json");
  const token = await getSpotifyToken(c.get("clerkUserId"));
  const source = await addSource(c.get("userId"), spotifyId, token);
  return c.json(source, 201);
};

export const removeSourcePlaylist = async (c: Context<AuthEnv, "/:id">) => {
  await removeSource(c.get("userId"), c.req.param("id"));
  return c.json({ ok: true });
};
