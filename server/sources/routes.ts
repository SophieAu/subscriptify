import { Hono } from "hono";
import { type AuthEnv, requireAuth } from "../shared/auth.ts";
import { getSpotifyToken } from "../shared/spotify.ts";
import { addSource, getActiveTarget, listSources, removeSource } from "./sources.ts";

export const sourcesRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get("/", async (c) => {
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
  })
  .post("/", async (c) => {
    const { spotifyId } = await c.req.json<{ spotifyId?: string }>();
    if (!spotifyId?.trim()) return c.json({ error: "spotifyId is required" }, 400);

    const token = await getSpotifyToken(c.get("clerkUserId"));
    const source = await addSource(c.get("userId"), spotifyId.trim(), token);
    return c.json(source, 201);
  })
  .delete("/:id", async (c) => {
    await removeSource(c.get("userId"), c.req.param("id"));
    return c.json({ ok: true });
  });
