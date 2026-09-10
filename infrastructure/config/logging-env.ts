import { z } from "zod";
import type { EnvSource } from "./env-source";

const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

export type ConfiguredLogLevel = z.infer<typeof logLevelSchema>;

export function getConfiguredLogLevel(
  env: EnvSource = process.env
): ConfiguredLogLevel {
  const configuredLevel = env.NEXT_PUBLIC_LOG_LEVEL || env.LOG_LEVEL;
  if (configuredLevel) return logLevelSchema.parse(configuredLevel.toLowerCase());
  return env.NODE_ENV === "test" ? "warn" : "info";
}
