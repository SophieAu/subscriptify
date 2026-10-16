import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  AXIOM_TOKEN: z.string(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_PUBLISHABLE_KEY: z.string(),
  IS_PRODUCTION: z.literal("true").optional().transform((v) => v === "true"),
});

export const env = EnvSchema.parse(Deno.env.toObject());
