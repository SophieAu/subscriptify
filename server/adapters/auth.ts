import { createClerkClient } from "@clerk/backend";
import { createMiddleware } from "hono/factory";
import { db } from "./db.ts";

const clerk = createClerkClient({
  secretKey: Deno.env.get("CLERK_SECRET_KEY"),
  publishableKey: Deno.env.get("CLERK_PUBLISHABLE_KEY"),
});

export type AuthEnv = {
  Variables: {
    userId: string; // our db User.id
    clerkUserId: string;
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const state = await clerk.authenticateRequest(c.req.raw);
  const auth = state.toAuth();
  if (!auth?.userId) return c.json({ error: "Unauthenticated" }, 401);

  const user = await db.user.upsert({
    where: { clerkId: auth.userId },
    update: {},
    create: { clerkId: auth.userId },
  });

  c.set("clerkUserId", auth.userId);
  c.set("userId", user.id);
  await next();
});

export const getSpotifyToken = async (clerkUserId: string) => {
  const tokens = await clerk.users.getUserOauthAccessToken(clerkUserId, "spotify");
  const token = tokens.data[0]?.token;
  if (!token) throw new Error("No Spotify token on the Clerk user");

  return token;
};
