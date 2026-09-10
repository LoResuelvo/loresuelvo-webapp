import { z } from "zod";
import type { EnvSource } from "./env-source";
import type { GoogleMapsRuntimeConfig } from "./public-runtime-config";
import { getAppEnvironment } from "./runtime-env";

const absoluteUrlSchema = z.string().trim().url();
const requiredValueSchema = z.string().trim().min(1);
const productionSecretSchema = z.string().regex(/^[a-fA-F0-9]{64}$/, {
  message: "AUTH0_SECRET must be a 32-byte secret encoded as 64 hexadecimal characters",
});

export interface Auth0RuntimeConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
  secret: string;
  audience?: string;
  appBaseUrl?: string;
}

function optionalTrimmedValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function getApiUrl(env: EnvSource = process.env): string {
  const configuredUrl = optionalTrimmedValue(env.API_URL);
  if (configuredUrl) return absoluteUrlSchema.parse(configuredUrl).replace(/\/$/, "");

  const appEnvironment = getAppEnvironment(env);
  if (appEnvironment === "development" || appEnvironment === "test") {
    return "http://localhost:8080";
  }
  throw new Error("API_URL is required in staging and production");
}

export function getAuth0RuntimeConfig(
  env: EnvSource = process.env
): Auth0RuntimeConfig {
  const appEnvironment = getAppEnvironment(env);
  const secretSchema =
    appEnvironment === "staging" || appEnvironment === "production"
      ? productionSecretSchema
      : requiredValueSchema;

  const appBaseUrl = optionalTrimmedValue(env.APP_BASE_URL);
  return {
    domain: requiredValueSchema.parse(env.AUTH0_DOMAIN),
    clientId: requiredValueSchema.parse(env.AUTH0_CLIENT_ID),
    clientSecret: requiredValueSchema.parse(env.AUTH0_CLIENT_SECRET),
    secret: secretSchema.parse(env.AUTH0_SECRET),
    audience: optionalTrimmedValue(env.AUTH0_AUDIENCE),
    appBaseUrl: appBaseUrl ? absoluteUrlSchema.parse(appBaseUrl) : undefined,
  };
}

export function getGoogleMapsRuntimeConfig(
  env: EnvSource = process.env
): GoogleMapsRuntimeConfig {
  return {
    apiKey: optionalTrimmedValue(env.GOOGLE_MAPS_API_KEY),
    mapId: optionalTrimmedValue(env.GOOGLE_MAPS_ID),
  };
}
