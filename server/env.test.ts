// import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// const validVars = {
//   DATABASE_URL: "localhost:123",
//   CLERK_SECRET_KEY: "clerk secret",
//   CLERK_PUBLISHABLE_KEY: "clerk public",
//   AXIOM_TOKEN: "xaat-123",
// };

// const loadEnv = async (vars: Record<string, string>) => {
//   vi.stubGlobal("Deno", { ...(globalThis as { Deno?: object }).Deno, env: { toObject: () => vars } });

//   return (await import("./env.ts")).env;
// };

// beforeEach(() => {
//   vi.resetModules();
// });

// afterEach(() => {
//   vi.unstubAllGlobals();
// });

// describe("env", () => {
//   it("parses a valid environment", async () => {
//     const env = await loadEnv(validVars);

//     expect(env).toEqual({ ...validVars, IS_PRODUCTION: false });
//   });

//   it("sets IS_PRODUCTION to true when the variable is 'true'", async () => {
//     const env = await loadEnv({ ...validVars, IS_PRODUCTION: "true" });

//     expect(env.IS_PRODUCTION).toBe(true);
//   });

//   it("sets IS_PRODUCTION to false when the variable is absent", async () => {
//     const env = await loadEnv(validVars);

//     expect(env.IS_PRODUCTION).toBe(false);
//   });

//   it("rejects IS_PRODUCTION values other than 'true'", async () => {
//     await expect(loadEnv({ ...validVars, IS_PRODUCTION: "false" })).rejects.toThrow();
//   });

//   it("rejects an environment with a missing variable", async () => {
//     const { PGHOST: _PGHOST, ...withoutHost } = validVars;

//     await expect(loadEnv(withoutHost)).rejects.toThrow();
//   });

//   it("rejects a recipient that is not an email address", async () => {
//     await expect(loadEnv({ ...validVars, EMAIL_RECIPIENT: "not-an-email" })).rejects.toThrow();
//   });
// });
