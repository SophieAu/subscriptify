import { ErrorResponse } from "./types";
import "isomorphic-fetch";
import { BEARER_TOKEN } from "./KEYS";

export const accessSpotifyAPI = async function <ResponseType>(
  uri: string,
  method: "GET" | "POST" = "GET"
) {
  const response = await fetch(uri, {
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + BEARER_TOKEN.get(),
      "Content-Type": "application/json",
    },
    method,
  });

  if (!response.ok) {
    const { error } = (await response.json()) as ErrorResponse;
    throw new Error(`${error.status}: ${error.message}`);
  }

  return (await response.json()) as ResponseType;
};
