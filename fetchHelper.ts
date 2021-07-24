import { ErrorResponse } from "./types";
import "isomorphic-fetch";
import { BEARER_TOKEN } from "./KEYS";

export const accessSpotifyAPI = async function <ResponseType>(
  uri: string,
  method: "GET" | "POST" = "GET",
  body?: {}
) {
  const response = await fetch(uri, {
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + BEARER_TOKEN.get(),
      "Content-Type": "application/json",
    },
    ...(body && { body: JSON.stringify(body) }),
    method,
  });

  if (!response.ok) {
    const { error } = (await response.json()) as ErrorResponse;
    throw new Error(`[${uri}] ${error.status}: ${error.message}`);
  }

  return (await response.json()) as ResponseType;
};
