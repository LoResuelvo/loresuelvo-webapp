import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should not log debug when LOG_LEVEL is info", () => {
    process.env.LOG_LEVEL = "info";
    logger.debug("test debug");
    expect(console.debug).not.toHaveBeenCalled();
  });

  it("should log debug when LOG_LEVEL is debug", () => {
    process.env.LOG_LEVEL = "debug";
    logger.debug("test debug");
    expect(console.debug).toHaveBeenCalledWith("[DEBUG] test debug");
  });

  it("should log info when LOG_LEVEL is info", () => {
    process.env.LOG_LEVEL = "info";
    logger.info("test info");
    expect(console.info).toHaveBeenCalledWith("[INFO] test info");
  });

  it("should log warn when LOG_LEVEL is warn", () => {
    process.env.LOG_LEVEL = "warn";
    logger.warn("test warn");
    expect(console.warn).toHaveBeenCalledWith("[WARN] test warn");
  });

  it("should log error when LOG_LEVEL is error", () => {
    process.env.LOG_LEVEL = "error";
    logger.error("test error");
    expect(console.error).toHaveBeenCalledWith("[ERROR] test error");
  });
});
