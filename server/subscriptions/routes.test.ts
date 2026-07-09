import { assertEquals } from "@std/assert";
import { Hono } from "hono";
import { validateAddSourcePlaylist } from "./routes.ts";

const app = new Hono().post("/", validateAddSourcePlaylist, (c) =>
  c.json(c.req.valid("json")));

const post = (body: unknown) =>
  app.request("/", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

Deno.test("validateAddSourcePlaylist rejects a missing spotifyId", async () => {
  const res = await post({});
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "spotifyId is required");
});

Deno.test("validateAddSourcePlaylist rejects a whitespace-only spotifyId", async () => {
  const res = await post({ spotifyId: "   " });
  assertEquals(res.status, 400);
});

Deno.test("validateAddSourcePlaylist rejects a non-string spotifyId", async () => {
  const res = await post({ spotifyId: 42 });
  assertEquals(res.status, 400);
});

Deno.test("validateAddSourcePlaylist trims and passes a valid spotifyId through", async () => {
  const res = await post({ spotifyId: "  37i9dQZF1DX4jP4eebSWR9  " });
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { spotifyId: "37i9dQZF1DX4jP4eebSWR9" });
});

Deno.test("validateAddSourcePlaylist strips a full open.spotify.com link", async () => {
  const res = await post({
    spotifyId: "https://open.spotify.com/playlist/28oY1vSsipRE5VOyLDQqed?si=566eec2711aa4a0a",
  });
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { spotifyId: "28oY1vSsipRE5VOyLDQqed" });
});

Deno.test("validateAddSourcePlaylist strips a link with an /intl-xx/ locale prefix", async () => {
  const res = await post({
    spotifyId: "https://open.spotify.com/intl-de/playlist/28oY1vSsipRE5VOyLDQqed",
  });
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { spotifyId: "28oY1vSsipRE5VOyLDQqed" });
});

Deno.test("validateAddSourcePlaylist strips a spotify:playlist: URI", async () => {
  const res = await post({ spotifyId: "spotify:playlist:28oY1vSsipRE5VOyLDQqed" });
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { spotifyId: "28oY1vSsipRE5VOyLDQqed" });
});
