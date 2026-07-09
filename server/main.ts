import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { type AuthEnv, requireAuth } from "./shared/auth.ts";
import {
  addSourcePlaylist,
  getSourcePlaylist,
  removeSourcePlaylist,
  validateAddSourcePlaylist,
} from "./subscriptions/routes.ts";
import { runSync } from "./sync/sync.ts";

const app = new Hono();

app.route("/api/sources", new Hono<AuthEnv>()
  .use(requireAuth)
  .get("/", getSourcePlaylist)
  .post("/", validateAddSourcePlaylist, addSourcePlaylist)
  .delete("/:id", removeSourcePlaylist));

app.route("/api/sync", new Hono<AuthEnv>()
  .use(requireAuth)
  .post("/", async (c) => c.json(await runSync(c.get("userId")))));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

// Astro's static build (build.format "file" → /login maps to login.html)
app.get("/login", serveStatic({ path: "./web/dist/login.html" }));
app.use("*", serveStatic({ root: "./web/dist" }));

Deno.serve(app.fetch);
