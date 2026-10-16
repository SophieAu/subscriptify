import { createClerkClient } from "@clerk/backend";
import { db } from "./db.ts";
import { env } from "../env.ts";

const clerk = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
});

type AuthResponse = { error: string } | { userId: string; authUserId: string };
export const authenticateUserOnRequest = async (rawRequest: Request): Promise<AuthResponse> => {
  const state = await clerk.authenticateRequest(rawRequest);
  const auth = state.toAuth();
  if (!auth?.userId) return { error: "Unauthenticated" };

  const user = await db.user.upsert({
    where: { authUserId: auth.userId },
    update: {},
    create: { authUserId: auth.userId },
  });

  return {
    authUserId: auth.userId,
    userId: user.id,
  };
};

export const getSpotifyToken = async (authUserId: string) => {
  const tokens = await clerk.users.getUserOauthAccessToken(authUserId, "spotify");
  const token = tokens.data[0]?.token;
  if (!token) throw new Error("No Spotify token on the Clerk user");

  return token;
};
