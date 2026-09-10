import { z } from "zod";

type TestEnvSource = Readonly<Record<string, string | undefined>>;

const appUrlSchema = z.string().trim().url("APP_URL must be an absolute URL");

export function getTestAppUrl(env: TestEnvSource = process.env): string {
  return appUrlSchema.parse(env.APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
}
