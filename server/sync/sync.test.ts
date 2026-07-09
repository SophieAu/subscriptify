import { assertEquals } from "@std/assert";
import { computeTracksToAdd } from "./sync.ts";

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
