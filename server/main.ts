import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { logger } from "hono/logger";
import { type AuthEnv, requireAuth } from "./adapters/auth.ts";
import { addSourcePlaylist, getSourcePlaylist, removeSourcePlaylist, sync } from "./api.ts";
import { validateAddSourcePlaylist } from "./middleware.ts";

const app = new Hono();

app.use(logger());

app.route(
  "/api/sources",
  new Hono<AuthEnv>()
    .use(requireAuth)
    .get("/", getSourcePlaylist)
    .post("/", validateAddSourcePlaylist, addSourcePlaylist)
    .delete("/:id", removeSourcePlaylist),
);

app.route(
  "/api/sync",
  new Hono<AuthEnv>()
    .use(requireAuth)
    .post("/", async (c) => c.json(await sync(c.get("userId")))),
);

app.use("*", serveStatic({ root: "./web/dist" }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

Deno.serve(app.fetch);
