import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "./generated/prisma/client.ts";

const adapter = new PrismaNeon({
  connectionString: Deno.env.get("DATABASE_URL")!,
});

export const db = new PrismaClient({ adapter });
