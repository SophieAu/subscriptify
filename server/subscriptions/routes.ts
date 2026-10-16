import type { Context, MiddlewareHandler } from "hono";
import { validator } from "hono/validator";
import { type AuthEnv, getSpotifyToken } from "../adapters/auth.ts";
import { addSource, getActiveTarget, getLastSyncedAt, listSources, removeSource } from "./subscriptions.ts";
import { runSync } from "../sync/sync.ts";

// Extracts the input type a validator middleware produces, so a handler's
// Context stays in sync with the validator instead of duplicating the shape.
// deno-lint-ignore no-explicit-any
type ValidatorInput<M> = M extends MiddlewareHandler<any, any, infer Input> ? Input
  : never;

const extractSpotifyPlaylistId = (rawSpotifyInput: string): string => {
  const uriMatch = rawSpotifyInput.match(/spotify:playlist:([A-Za-z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  const urlMatch = rawSpotifyInput.match(/\/playlist\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  return rawSpotifyInput;
};

// MIDDLEWARE
export const validateAddSourcePlaylist = validator("json", (body: Record<string, unknown>, c) => {
  const rawSpotifyInput = typeof body.spotifyId === "string" ? body.spotifyId.trim() : "";
  if (!rawSpotifyInput) return c.json({ error: "spotifyId is required" }, 400);

  return { spotifyId: extractSpotifyPlaylistId(rawSpotifyInput) };
});

// GET /api/sources
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

// POST /api/sources
export const addSourcePlaylist = async (
  c: Context<AuthEnv, "/", ValidatorInput<typeof validateAddSourcePlaylist>>,
) => {
  const { spotifyId } = c.req.valid("json");
  const token = await getSpotifyToken(c.get("clerkUserId"));

  const source = await addSource(c.get("userId"), spotifyId, token);

  return c.json(source, 201);
};

// DELETE /api/sources
export const removeSourcePlaylist = async (c: Context<AuthEnv, "/:id">) => {
  await removeSource(c.get("userId"), c.req.param("id"));

  return c.json({ ok: true });
};

// GET /api/sync
export const sync = async (userId: string) => {
  await runSync(userId);
};
