import { getAuthService } from "@/lib/auth";

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

  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders();

    console.log(`[ApiClient] ${options.method} a ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

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
