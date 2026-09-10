import { z } from "zod";
import type { EnvSource } from "./env-source";

const publicMediaBaseUrlSchema = z
  .string()
  .trim()
  .url("PUBLIC_MEDIA_BASE_URL must be an absolute URL")
  .refine((value) => value.startsWith("https://"), {
    message: "PUBLIC_MEDIA_BASE_URL must use HTTPS",
  });

export function getPublicMediaBaseUrl(
  env: EnvSource = process.env
): URL | null {
  const value = env.PUBLIC_MEDIA_BASE_URL?.trim();
  if (!value) return null;
  return new URL(publicMediaBaseUrlSchema.parse(value));
}
