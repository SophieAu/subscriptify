import type { Context } from "hono";
import { getSpotifyToken } from "./adapters/auth.ts";
import { addSource, getActiveTarget, getLastSyncedAt, listSources, removeSource } from "./core/subscriptions.ts";
import { runSync } from "./core/sync.ts";
import { AuthEnv, validateAddSourcePlaylist, ValidatorInput } from "./middleware.ts";

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
  const token = await getSpotifyToken(c.get("authUserId"));

  const source = await addSource(c.get("userId"), spotifyId, token);

  return c.json(source, 201);
};

// DELETE /api/sources
export const removeSourcePlaylist = async (c: Context<AuthEnv, "/:id">) => {
  await removeSource(c.get("userId"), c.req.param("id"));

  return c.json({ ok: true });
};

// POST /api/sync
export const sync = async (c: Context<AuthEnv, "/">) => {
  const userId = c.get("userId");
  const result = await runSync(userId);

  return c.json(result);
};
