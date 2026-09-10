import { z } from "zod";
import type { EnvSource } from "./env-source";

const appEnvironmentSchema = z.enum([
  "development",
  "test",
  "staging",
  "production",
]);

export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;

export function getAppEnvironment(
  env: EnvSource = process.env
): AppEnvironment {
  const configuredEnvironment = env.APP_ENV?.trim();
  if (configuredEnvironment) {
    return appEnvironmentSchema.parse(configuredEnvironment);
  }

  if (env.NODE_ENV === "test") return "test";
  throw new Error("APP_ENV is required outside the test runner");
}

export function usesE2EAdapters(env: EnvSource = process.env): boolean {
  const appEnvironment = getAppEnvironment(env);
  return appEnvironment === "development" || appEnvironment === "test";
}

export function showsDevelopmentTools(env: EnvSource = process.env): boolean {
  return usesE2EAdapters(env);
}
