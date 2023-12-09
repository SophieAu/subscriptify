import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  targetPlaylists: defineTable({
    spotifyId: v.string(),
    previousTracks: v.array(v.string()),
    imageId: v.optional(v.string()),
  }),
  users: defineTable({}),
  subscriptions: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("artist"), v.literal("plylist")),
    sourceSpotifyId: v.string(),
    targetPlalistId: v.id("targetPlaylists"),
    addPrevious: v.boolean(),
    addUnplayable: v.boolean(),
  }),
});
