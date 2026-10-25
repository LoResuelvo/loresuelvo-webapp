import { getAuthService } from "@/infrastructure/auth";
import type { ApiStub } from "./types";
import {
  E2E_SCENARIO_COOKIE,
  hasActiveE2EContext,
  parseE2EStubsFromCookies,
} from "./e2e-stubs-utils";
import { logger } from "@/infrastructure/logging/logger";
import { getApiUrl } from "@/infrastructure/config/server-env";
import { usesE2EAdapters } from "@/infrastructure/config/runtime-env";

const API_REQUEST_TIMEOUT_MS = 30000;
const SAFE_ERROR_NAMES = new Set(["AbortError", "TypeError", "Error", "NetworkError", "TimeoutError"]);
const SAFE_NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

function readErrorProperty(error: unknown, property: string): unknown {
  if (typeof error !== "object" || error === null) return undefined;

  try {
    return (error as Record<string, unknown>)[property];
  } catch {
    return undefined;
  }
}

function getSafeErrorName(error: unknown): string {
  const name = readErrorProperty(error, "name");
  return typeof name === "string" && SAFE_ERROR_NAMES.has(name) ? name : "UnknownError";
}

function getSafeErrorCode(error: unknown): string | undefined {
  let candidate: unknown = error;
  const visited = new Set<unknown>();

  for (let depth = 0; depth < 3 && candidate !== undefined; depth += 1) {
    if (visited.has(candidate)) return undefined;
    visited.add(candidate);

    const code = readErrorProperty(candidate, "code");
    if (typeof code === "string" && SAFE_NETWORK_ERROR_CODES.has(code)) return code;
    candidate = readErrorProperty(candidate, "cause");
  }

  return undefined;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string,
    public body?: unknown,
  ) {
    super(message || `API Error: ${status} ${statusText}`);
    this.name = "ApiClientError";
  }
}

export class ApiClient {
  private async getHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    try {
      const authService = getAuthService();
      const session = await authService.getSession();

      if (session?.accessToken) {
        headers["Authorization"] = `Bearer ${session.accessToken}`;
      }
    } catch (error) {
      console.warn("The session could not be obtained to inject the token", error);
    }

    return headers;
  }

  private async resolveE2EStub<T>(method: string, endpoint: string): Promise<T | null> {
    if (!usesE2EAdapters()) return null;
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll().map(c => ({ name: c.name, value: c.value }));
      if (!hasActiveE2EContext(allCookies)) return null;

      const stubs = parseE2EStubsFromCookies(allCookies);

      if (stubs.length === 0) return null;
      const match = stubs.find(
        (s) => s.method.toUpperCase() === method.toUpperCase() && s.endpoint === endpoint
      );

      if (!match) return null;

      if (match.delayMs && match.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, match.delayMs));
      }

      logger.debug(`[ApiClient] [E2E] Stub found: ${match.status} for ${method} ${endpoint}`);

      const isSuccess = match.status >= 200 && match.status < 300;
      if (isSuccess) return match.body as T;

      const errorMessage = typeof match.body === "object" && match.body !== null && "error" in match.body
        ? String((match.body as Record<string, unknown>).error)
        : `Error ${match.status}`;

      throw new ApiClientError(match.status, `HTTP Error ${match.status}`, errorMessage, match.body);
    } catch (e) {
      if (e instanceof ApiClientError) throw e;
      return null;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${getApiUrl()}${endpoint}`;
    const headers = await this.getHeaders();

    const e2eResult = await this.resolveE2EStub<T>(options.method ?? "", endpoint);
    if (e2eResult !== null) return e2eResult;

    if (usesE2EAdapters()) {
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        if (hasActiveE2EContext(allCookies)) {
          const scenarioCookie = cookieStore.get(E2E_SCENARIO_COOKIE);
          const scenarioInfo = scenarioCookie ? decodeURIComponent(scenarioCookie.value) : "Unknown Scenario";
          logger.warn(`[ApiClient] [E2E] [${scenarioInfo}] No stub provided for ${options.method || "GET"} ${endpoint}`);
          throw new ApiClientError(404, "Not Found", `[${scenarioInfo}] No E2E stub found for ${options.method || "GET"} ${endpoint}`, null);
        }
      } catch (e) {
        if (e instanceof ApiClientError) throw e;
      }
    }

    // Default timeout for all API calls to prevent hanging.
    const controller = new AbortController();
    const startedAt = Date.now();
    const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        cache: "no-store",
        ...options,
        signal: controller.signal,
        headers: {
          ...headers,
          ...options.headers,
        },
      });
    } catch (error) {
      const kind = controller.signal.aborted ? "timeout" : "network";
      const safeErrorCode = getSafeErrorCode(error);

      logger.error("[ApiClient] Request failed", {
        kind,
        method: options.method ?? "GET",
        durationMs: Math.max(0, Date.now() - startedAt),
        causeName: getSafeErrorName(error),
        ...(safeErrorCode ? { causeCode: safeErrorCode } : {}),
      });

      throw new ApiClientError(504, "Gateway Timeout", "The API request timed out or failed to connect", null);
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    const responseBody = await response.text();
    const parsedBody = this.parseResponseBody(responseBody);

    if (!response.ok) {
      const message = this.getErrorMessage(parsedBody) || responseBody || response.statusText;
      // Error bodies can contain private testimony or temporary evidence URLs.
      console.error("[ApiClient] Request failed", { status: response.status, method: options.method });
      throw new ApiClientError(response.status, response.statusText, message, parsedBody);
    }

    return parsedBody as T;
  }

  private parseResponseBody(responseBody: string): unknown {
    if (!responseBody) {
      return null;
    }

    try {
      return JSON.parse(responseBody);
    } catch {
      return responseBody;
    }
  }

  private getErrorMessage(body: unknown): string | undefined {
    if (typeof body === "object" && body !== null && "error" in body) {
      const error = (body as { error?: unknown }).error;
      return typeof error === "string" ? error : undefined;
    }

    if (typeof body === "string") {
      return body;
    }

    return undefined;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    });
  }

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient();
