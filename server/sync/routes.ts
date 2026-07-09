import { Hono } from "hono";
import { type AuthEnv, requireAuth } from "../shared/auth.ts";
import { runSync } from "./sync.ts";

export const syncRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .post("/", async (c) => c.json(await runSync(c.get("userId"))));
