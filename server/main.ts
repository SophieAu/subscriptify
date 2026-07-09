import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { sourcesRoutes } from "./sources/routes.ts";
import { syncRoutes } from "./sync/routes.ts";

const app = new Hono();

app.route("/api/sources", sourcesRoutes);
app.route("/api/sync", syncRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

// Astro's static build (build.format "file" → /login maps to login.html)
app.get("/login", serveStatic({ path: "./web/dist/login.html" }));
app.use("*", serveStatic({ root: "./web/dist" }));

Deno.serve(app.fetch);
