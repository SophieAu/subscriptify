// deno-lint-ignore-file no-explicit-any
/** biome-ignore-all lint/suspicious/noExplicitAny: just passing along the original console log type */
import { Axiom } from "@axiomhq/js";
import { env } from "../env.ts";
import { getContext } from "hono/context-storage";

const AXIOM_DATASET_NAME = "subscriptify";

const axiom = new Axiom({ token: env.AXIOM_TOKEN });

type LogMessageFormat = string | object;

const formatMessage = (message: LogMessageFormat | Error) => {
  if (typeof message === "string") return message;
  if (Error.isError(message)) return message.stack ?? message.message;

  return message;
};

const logToAxiom = (level: "error" | "warn" | "info", message: LogMessageFormat) => {
  if (!env.IS_PRODUCTION) return;

  axiom.ingest(AXIOM_DATASET_NAME, [{
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId: getContext().var.requestId,
  }]);
};

const error = (logMesaage: LogMessageFormat) => {
  const message = formatMessage(logMesaage);

  console.error(message);
  logToAxiom("error", message);
};

const info = (logMesaage: LogMessageFormat) => {
  const message = formatMessage(logMesaage);

  console.info(message);
  logToAxiom("info", message);
};

const warn = (logMesaage: LogMessageFormat) => {
  const message = formatMessage(logMesaage);

  console.warn(message);
  logToAxiom("warn", message);
};

const flush = () => axiom.flush();

export const logger = { error, info, warn, flush };
