/** biome-ignore-all lint/suspicious/noExplicitAny: see below */
import type { MiddlewareHandler } from "hono";

// Extracts the input type a validator middleware produces, so a handler's
// Context stays in sync with the validator instead of duplicating the shape.
// deno-lint-ignore no-explicit-any
export type ValidatorInput<M> = M extends MiddlewareHandler<any, any, infer Input> ? Input
  : never;
