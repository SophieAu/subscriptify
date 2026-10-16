import type { MiddlewareHandler } from "hono";
import { validator } from "hono/validator";

// Extracts the input type a validator middleware produces, so a handler's
// Context stays in sync with the validator instead of duplicating the shape.
// deno-lint-ignore no-explicit-any
export type ValidatorInput<M> = M extends MiddlewareHandler<any, any, infer Input> ? Input
  : never;

const extractSpotifyPlaylistId = (rawSpotifyInput: string): string => {
  const uriMatch = rawSpotifyInput.match(/spotify:playlist:([A-Za-z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  const urlMatch = rawSpotifyInput.match(/\/playlist\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  return rawSpotifyInput;
};

export const validateAddSourcePlaylist = validator("json", (body: Record<string, unknown>, c) => {
  const rawSpotifyInput = typeof body.spotifyId === "string" ? body.spotifyId.trim() : "";
  if (!rawSpotifyInput) return c.json({ error: "spotifyId is required" }, 400);

  return { spotifyId: extractSpotifyPlaylistId(rawSpotifyInput) };
});
