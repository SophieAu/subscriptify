import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { type AuthEnv, logging, requireAuth } from "./middleware.ts";
import { addSourcePlaylist, getSourcePlaylist, removeSourcePlaylist, sync } from "./api.ts";
import { validateAddSourcePlaylist } from "./middleware.ts";
import { requestId } from "hono/request-id";
import { contextStorage } from "hono/context-storage";

const app = new Hono();

app.use(requestId());
app.use(contextStorage());
app.use(logging);

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
    .post("/", sync),
);

app.use("*", serveStatic({ root: "./web/dist" }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

Deno.serve(app.fetch);
