import { setWorldConstructor, World, IWorldOptions } from "@cucumber/cucumber";
import { Browser, BrowserContext, Page } from "playwright";
import type { ApiStub, HttpMethod } from "../../infrastructure/api/types";
import { addApiStub, getStubs, hasApiStub } from "../step-definitions/stubs-helper";

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
}

setWorldConstructor(CustomWorld);
