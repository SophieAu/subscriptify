import { beforeEach, describe, expect, it, vi } from "vitest";
import { Axiom } from "@axiomhq/js";

const { mockEnv, ingest, axiomFlush } = vi.hoisted(() => ({
  mockEnv: { IS_PRODUCTION: false, AXIOM_TOKEN: "test-token" },
  ingest: vi.fn(),
  axiomFlush: vi.fn(),
}));

vi.mock("@axiomhq/js", () => ({
  Axiom: vi.fn(function () {
    return { ingest, flush: axiomFlush };
  }),
}));
vi.mock("../env.ts", () => ({ env: mockEnv }));

const loadLogger = async () => (await import("./logging.ts")).logger;

let consoleLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mockEnv.IS_PRODUCTION = false;
  consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("logger", () => {
  it("creates the Axiom client with the configured token", async () => {
    await loadLogger();

    expect(Axiom).toHaveBeenCalledWith({ token: "test-token" });
  });

  it("logs info messages to the console", async () => {
    const logger = await loadLogger();

    logger.info("hello");

    expect(consoleLog).toHaveBeenCalledWith("INFO: hello");
  });

  it("logs warn messages to the console in orange", async () => {
    const logger = await loadLogger();

    logger.warn("watch out");

    expect(consoleLog).toHaveBeenCalledWith("%cWARN: watch out", "color: orange");
  });

  it("logs error messages to the console in red", async () => {
    const logger = await loadLogger();

    logger.error("boom");

    expect(consoleLog).toHaveBeenCalledWith("%cERROR: boom", "color: red");
  });

  it("delegates flush to the Axiom client", async () => {
    const logger = await loadLogger();

    await logger.flush();

    expect(axiomFlush).toHaveBeenCalledTimes(1);
  });
});

describe("message formatting", () => {
  it("stringifies non-object values", async () => {
    const logger = await loadLogger();

    logger.info(42, true, "text");

    expect(consoleLog).toHaveBeenCalledWith("INFO: 42 true text");
  });

  it("uses the stack of errors", async () => {
    const logger = await loadLogger();
    const error = new Error("boom");
    error.stack = "Error: boom\n    at somewhere";

    logger.error("CRON FAILED:", error);

    expect(consoleLog).toHaveBeenCalledWith("%cERROR: CRON FAILED: Error: boom\n    at somewhere", "color: red");
  });

  it("falls back to the message of errors without a stack", async () => {
    const logger = await loadLogger();
    const error = new Error("boom");
    error.stack = undefined;

    logger.error(error);

    expect(consoleLog).toHaveBeenCalledWith("%cERROR: boom", "color: red");
  });

  it("json-stringifies plain objects", async () => {
    const logger = await loadLogger();

    logger.info("payload:", { a: 1 });

    expect(consoleLog).toHaveBeenCalledWith('INFO: payload: {"a":1}');
  });
});

describe("logging to Axiom", () => {
  it("does not ingest outside of production", async () => {
    const logger = await loadLogger();

    logger.info("hello");
    logger.warn("watch out");
    logger.error("boom");

    expect(ingest).not.toHaveBeenCalled();
  });

  it.each([
    ["info", "hello"],
    ["warn", "watch out"],
    ["error", "boom"],
  ] as const)("ingests %s messages in production", async (level, message) => {
    mockEnv.IS_PRODUCTION = true;
    const logger = await loadLogger();

    logger[level](message);

    expect(ingest).toHaveBeenCalledWith("card-herdier", [
      { level, message, timestamp: expect.any(String) },
    ]);
  });

  it("uses an ISO timestamp", async () => {
    mockEnv.IS_PRODUCTION = true;
    const logger = await loadLogger();

    logger.info("hello");

    const { timestamp } = ingest.mock.calls[0][1][0];
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
