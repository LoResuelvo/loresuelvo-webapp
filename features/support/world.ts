import { setWorldConstructor, World, IWorldOptions } from "@cucumber/cucumber";
import { Browser, BrowserContext, Page } from "playwright";
import type { ApiStub, HttpMethod } from "../../infrastructure/api/types";
import { addApiStub, getStubs, hasApiStub } from "../step-definitions/stubs-helper";
import { MOCK_SESSION_COOKIE } from "../../infrastructure/auth/mock-adapter";
import { AuthSession } from "../../infrastructure/auth/types";
import { aSession } from "./factories";

export const APP_URL = process.env.APP_URL || "http://localhost:3001";

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  appUrl: string = APP_URL;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async getStubs(): Promise<ApiStub[]> {
    return getStubs(this.page);
  }

  async addApiStub(stub: ApiStub): Promise<void> {
    return addApiStub(this.page, stub);
  }

  async hasApiStub(method: HttpMethod, endpoint: string): Promise<boolean> {
    return hasApiStub(this.page, method, endpoint);
  }

  // --- Fluent Stub Helpers ---

  async stubGet(endpoint: string, body: unknown, status: number = 200): Promise<void> {
    return this.addApiStub({ method: "GET", endpoint, status, body });
  }

  async stubPost(endpoint: string, status: number = 200, body: unknown = {}): Promise<void> {
    return this.addApiStub({ method: "POST", endpoint, status, body });
  }

  async stubPatch(endpoint: string, status: number = 200, body: unknown = {}): Promise<void> {
    return this.addApiStub({ method: "PATCH", endpoint, status, body });
  }

  async stubPut(endpoint: string, status: number = 200, body: unknown = {}): Promise<void> {
    return this.addApiStub({ method: "PUT", endpoint, status, body });
  }

  async stubDelete(endpoint: string, status: number = 200, body: unknown = {}): Promise<void> {
    return this.addApiStub({ method: "DELETE", endpoint, status, body });
  }

  // --- Auth Session Helpers ---

  async setSession(
    role: "consumer" | "provider" = "consumer",
    userOverrides: Partial<AuthSession["user"]> = {}
  ): Promise<void> {
    const session = aSession(role, userOverrides);
    await this.page.context().addCookies([
      {
        name: MOCK_SESSION_COOKIE,
        value: encodeURIComponent(JSON.stringify(session)),
        domain: "localhost",
        path: "/",
      },
    ]);
  }
}

setWorldConstructor(CustomWorld);
