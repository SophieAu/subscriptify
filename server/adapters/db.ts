import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "./generated/prisma/client.ts";

// Route pooled queries over stateless HTTP instead of a WebSocket: in a
// long-running Deno server the WS transport wedges on large writes (a big
// oldTrackIds push hangs with the backend stuck in ClientRead forever).
neonConfig.poolQueryViaFetch = true;

const adapter = new PrismaNeon({
  connectionString: Deno.env.get("DATABASE_URL")!,
});

export const db = new PrismaClient({ adapter });
