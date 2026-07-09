import { assertEquals } from "@std/assert";
import { computeNewlySeenUris, computeTracksToAdd, playlistMetadataFields } from "./sync.ts";

Deno.test("computeTracksToAdd skips tracks currently in the target", () => {
  const toAdd = computeTracksToAdd(["a", "b", "c"], ["b"], []);
  assertEquals(toAdd, ["a", "c"]);
});

Deno.test("computeTracksToAdd skips tracks that were ever in the target", () => {
  const toAdd = computeTracksToAdd(["a", "b", "c"], [], ["a", "c"]);
  assertEquals(toAdd, ["b"]);
});

Deno.test("computeTracksToAdd dedupes tracks appearing in multiple sources", () => {
  const toAdd = computeTracksToAdd(["a", "b", "a", "b"], [], []);
  assertEquals(toAdd, ["a", "b"]);
});

Deno.test("computeTracksToAdd returns nothing when everything is known", () => {
  const toAdd = computeTracksToAdd(["a", "b"], ["a"], ["b"]);
  assertEquals(toAdd, []);
});

Deno.test("computeTracksToAdd handles empty sources", () => {
  assertEquals(computeTracksToAdd([], ["a"], ["b"]), []);
});

Deno.test("computeNewlySeenUris records current target tracks not yet in oldTrackIds", () => {
  assertEquals(computeNewlySeenUris(["a", "b"], [], []), ["a", "b"]);
});

Deno.test("computeNewlySeenUris merges current target tracks with the added ones", () => {
  assertEquals(computeNewlySeenUris(["a"], ["b", "c"], []), ["a", "b", "c"]);
});

Deno.test("computeNewlySeenUris skips URIs already recorded in oldTrackIds", () => {
  assertEquals(computeNewlySeenUris(["a", "b"], ["c"], ["a"]), ["b", "c"]);
});

Deno.test("computeNewlySeenUris dedupes", () => {
  assertEquals(computeNewlySeenUris(["a", "a"], ["a"], []), ["a"]);
});

Deno.test("computeNewlySeenUris returns nothing when all are already recorded", () => {
  assertEquals(computeNewlySeenUris(["a", "b"], [], ["a", "b"]), []);
});

Deno.test("playlistMetadataFields takes name and the first image url", () => {
  const fields = playlistMetadataFields({
    id: "p1",
    name: "Fresh Finds",
    images: [{ url: "first" }, { url: "second" }],
  });
  assertEquals(fields.name, "Fresh Finds");
  assertEquals(fields.imageUrl, "first");
});

Deno.test("playlistMetadataFields falls back to null image when there are none", () => {
  assertEquals(playlistMetadataFields({ id: "p1", name: "N", images: [] }).imageUrl, null);
  assertEquals(playlistMetadataFields({ id: "p1", name: "N", images: null }).imageUrl, null);
});
