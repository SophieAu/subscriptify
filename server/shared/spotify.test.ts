import { assertEquals, assertRejects } from "@std/assert";
import {
  addTracksToPlaylist,
  getAllPlaylistTrackUris,
  spotifyFetch,
} from "./spotify.ts";

type Call = { url: string; init?: RequestInit };

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const withStubbedFetch = async (
  handler: (call: Call, callCount: number) => Response,
  run: (calls: Call[]) => Promise<void>,
) => {
  const original = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init };
    calls.push(call);
    return Promise.resolve(handler(call, calls.length));
  }) as typeof fetch;

  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
  }
};

Deno.test("spotifyFetch sends the bearer token", async () => {
  await withStubbedFetch(
    () => json({}),
    async (calls) => {
      await spotifyFetch("token-123", "https://api.spotify.com/v1/whatever");
      const headers = calls[0].init?.headers as Record<string, string>;
      assertEquals(headers.Authorization, "Bearer token-123");
    },
  );
});

Deno.test("spotifyFetch throws on non-OK responses", async () => {
  await withStubbedFetch(
    () => new Response("nope", { status: 403 }),
    async () => {
      await assertRejects(
        () => spotifyFetch("token", "https://api.spotify.com/v1/whatever"),
        Error,
        "Spotify 403",
      );
    },
  );
});

Deno.test("getAllPlaylistTrackUris follows pagination and skips null tracks", async () => {
  const page2 = "https://api.spotify.com/v1/playlists/pl1/tracks?offset=100";
  await withStubbedFetch(
    (call) =>
      call.url === page2
        ? json({ next: null, items: [{ track: { uri: "c" } }] })
        : json({
          next: page2,
          items: [{ track: { uri: "a" } }, { track: null }, { track: { uri: "b" } }],
        }),
    async (calls) => {
      const uris = await getAllPlaylistTrackUris("token", "pl1");
      assertEquals(uris, ["a", "b", "c"]);
      assertEquals(calls.length, 2);
      assertEquals(calls[1].url, page2);
    },
  );
});

Deno.test("addTracksToPlaylist posts in chunks of 100", async () => {
  const uris = Array.from({ length: 250 }, (_, i) => `uri-${i}`);
  await withStubbedFetch(
    () => json({}),
    async (calls) => {
      await addTracksToPlaylist("token", "pl1", uris);
      assertEquals(calls.length, 3);

      const bodies = calls.map(
        (call) => JSON.parse(call.init?.body as string).uris as string[],
      );
      assertEquals(bodies.map((b) => b.length), [100, 100, 50]);
      assertEquals(bodies[0][0], "uri-0");
      assertEquals(bodies[2][49], "uri-249");
      assertEquals(calls[0].init?.method, "POST");
    },
  );
});

Deno.test("addTracksToPlaylist makes no requests for an empty list", async () => {
  await withStubbedFetch(
    () => json({}),
    async (calls) => {
      await addTracksToPlaylist("token", "pl1", []);
      assertEquals(calls.length, 0);
    },
  );
});
