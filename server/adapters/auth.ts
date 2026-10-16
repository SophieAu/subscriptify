import { createClerkClient } from "@clerk/backend";
import { createMiddleware } from "hono/factory";
import { db } from "./db.ts";
import { env } from "../env.ts";

const clerk = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
});

export type AuthEnv = {
  Variables: {
    userId: string; // our db User.id
    authUserId: string;
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const state = await clerk.authenticateRequest(c.req.raw);
  const auth = state.toAuth();
  if (!auth?.userId) return c.json({ error: "Unauthenticated" }, 401);

  const user = await db.user.upsert({
    where: { authUserId: auth.userId },
    update: {},
    create: { authUserId: auth.userId },
  });

  c.set("authUserId", auth.userId);
  c.set("userId", user.id);
  await next();
});

export const getSpotifyToken = async (authUserId: string) => {
  const tokens = await clerk.users.getUserOauthAccessToken(authUserId, "spotify");
  const token = tokens.data[0]?.token;
  if (!token) throw new Error("No Spotify token on the Clerk user");

  return token;
};
