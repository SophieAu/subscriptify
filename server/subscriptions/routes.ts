import type { Context } from "hono";
import { validator } from "hono/validator";
import type { AuthEnv } from "../shared/auth.ts";
import { getSpotifyToken } from "../shared/spotify.ts";
import type { ValidatorInput } from "../shared/validation.ts";
import { addSource, getActiveTarget, listSources, removeSource } from "./subscriptions.ts";

export const validateAddSourcePlaylist = validator("json", (body: Record<string, unknown>, c) => {
  const spotifyId = typeof body.spotifyId === "string" ? body.spotifyId.trim() : "";
  if (!spotifyId) return c.json({ error: "spotifyId is required" }, 400);
  return { spotifyId };
});

export const getSourcePlaylist = async (c: Context<AuthEnv>) => {
  const [target, sources] = await Promise.all([
    getActiveTarget(),
    listSources(c.get("userId")),
  ]);
  return c.json({
    target: target && {
      spotifyId: target.spotifyId,
      name: target.name,
      imageUrl: target.imageUrl,
    },
    sources,
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
