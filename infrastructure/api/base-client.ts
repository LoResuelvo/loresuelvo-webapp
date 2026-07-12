import { getAuthService } from "@/infrastructure/auth";
import type { ApiStub } from "./types";
import { parseE2EStubsFromCookies } from "./e2e-stubs-utils";

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
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.API_URL || "http://localhost:8080"; // TODO: change all this to use app config
  }

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
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();

      if (!cookieStore.has("__e2e_session")) return null;
      
      const allCookies = cookieStore.getAll().map(c => ({ name: c.name, value: c.value }));
      const stubs = parseE2EStubsFromCookies(allCookies);

      if (stubs.length === 0) return null;
      const match = stubs.find(
        (s) => s.method.toUpperCase() === method.toUpperCase() && s.endpoint === endpoint
      );

      if (!match) return null;

      console.log(`[ApiClient] [E2E] Stub found: ${match.status} for ${method} ${endpoint}`);

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
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders();

    const e2eResult = await this.resolveE2EStub<T>(options.method ?? "", endpoint);
    if (e2eResult !== null) return e2eResult;

    // Default timeout of 5000ms for all API calls to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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
    } catch (e) {
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
      console.error(`[ApiClient] Error ${response.status} en ${url}: ${responseBody}`);
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

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
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
