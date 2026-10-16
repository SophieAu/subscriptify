// deno-lint-ignore-file no-explicit-any
/** biome-ignore-all lint/suspicious/noExplicitAny: just passing along the original console log type */
import { Axiom } from "@axiomhq/js";
import { env } from "../env.ts";

const AXIOM_DATASET_NAME = "subscriptify";

const axiom = new Axiom({ token: env.AXIOM_TOKEN });

const formatMessage = (...data: any[]) =>
  data.map((d) => {
    if (typeof d !== "object") return String(d);

    if (Error.isError(d)) return d.stack ?? d.message;

    return JSON.stringify(d);
  }).join(" ");

const logToAxiom = (level: "error" | "warn" | "info", message: string) => {
  if (!env.IS_PRODUCTION) return;

  axiom.ingest(AXIOM_DATASET_NAME, [{ level, message, timestamp: new Date().toISOString() }]);
};

const error = (...data: any[]) => {
  const message = formatMessage(...data);

  console.log(`%cERROR: ${message}`, "color: red");
  logToAxiom("error", message);
};

const info = (...data: any[]) => {
  const message = formatMessage(...data);

  console.log(`INFO: ${message}`);
  logToAxiom("info", message);
};

const warn = (...data: any[]) => {
  const message = formatMessage(...data);

  console.log(`%cWARN: ${message}`, "color: orange");
  logToAxiom("warn", message);
};

const flush = () => axiom.flush();

export const logger = { error, info, warn, flush };
