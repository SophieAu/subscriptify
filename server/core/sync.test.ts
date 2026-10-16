import { assertEquals } from "@std/assert";
import { getGenuinelyNewSongs, getSongsNotLoggedInDB } from "./sync.ts";
import { playlistMetadataFields } from "./toMoveOut.ts";

Deno.test("getGenuinelyNewSongs skips tracks currently in the target", () => {
  const toAdd = getGenuinelyNewSongs(["a", "b", "c"], ["b"], []);
  assertEquals(toAdd, ["a", "c"]);
});

Deno.test("getGenuinelyNewSongs skips tracks that were ever in the target", () => {
  const toAdd = getGenuinelyNewSongs(["a", "b", "c"], [], ["a", "c"]);
  assertEquals(toAdd, ["b"]);
});

Deno.test("getGenuinelyNewSongs dedupes tracks appearing in multiple sources", () => {
  const toAdd = getGenuinelyNewSongs(["a", "b", "a", "b"], [], []);
  assertEquals(toAdd, ["a", "b"]);
});

Deno.test("getGenuinelyNewSongs returns nothing when everything is known", () => {
  const toAdd = getGenuinelyNewSongs(["a", "b"], ["a"], ["b"]);
  assertEquals(toAdd, []);
});

Deno.test("getGenuinelyNewSongs handles empty sources", () => {
  assertEquals(getGenuinelyNewSongs([], ["a"], ["b"]), []);
});

Deno.test("getSongsNotLoggedInDB records current target tracks not yet in oldTrackIds", () => {
  assertEquals(getSongsNotLoggedInDB(["a", "b"], [], []), ["a", "b"]);
});

Deno.test("getSongsNotLoggedInDB merges current target tracks with the added ones", () => {
  assertEquals(getSongsNotLoggedInDB(["a"], ["b", "c"], []), ["a", "b", "c"]);
});

Deno.test("getSongsNotLoggedInDB skips URIs already recorded in oldTrackIds", () => {
  assertEquals(getSongsNotLoggedInDB(["a", "b"], ["c"], ["a"]), ["b", "c"]);
});

Deno.test("getSongsNotLoggedInDB dedupes", () => {
  assertEquals(getSongsNotLoggedInDB(["a", "a"], ["a"], []), ["a"]);
});

Deno.test("getSongsNotLoggedInDB returns nothing when all are already recorded", () => {
  assertEquals(getSongsNotLoggedInDB(["a", "b"], [], ["a", "b"]), []);
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
