import { ErrorResponse } from "./types";

const BEARER_TOKEN = "";

const REQUEST_HEADER = {
  Accept: "application/json",
  Authorization: "Bearer " + BEARER_TOKEN,
  "Content-Type": "application/json",
};

export const accessSpotifyAPI = async function <ResponseType>(
  uri: string,
  method: "GET" | "POST"
) {
  const response = await fetch(uri, {
    headers: REQUEST_HEADER,
    method,
  });

  if (!response.ok) {
    const { error } = (await response.json()) as ErrorResponse;
    throw new Error(`${error.status}: ${error.message}`);
  }

  return (await response.json()) as ResponseType;
};
