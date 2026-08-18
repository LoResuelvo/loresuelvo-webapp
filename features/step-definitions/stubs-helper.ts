import type { ApiStub, HttpMethod } from "../../infrastructure/api/types";
import type { Page } from "playwright";
import { parseE2EStubsFromCookies, createE2EStubCookies } from "../../infrastructure/api/e2e-stubs-utils";

export { ApiStub, HttpMethod };

export async function getStubs(page: Page): Promise<ApiStub[]> {
  const cookies = await page.context().cookies();
  return parseE2EStubsFromCookies(cookies);
}

export async function addApiStub(page: Page, stub: ApiStub): Promise<void> {
  let stubs = await getStubs(page);
  stubs = stubs.filter((s) => !(s.method === stub.method && s.endpoint === stub.endpoint));
  stubs.push(stub);

  const cookiesToSet = createE2EStubCookies(stubs);
  await page.context().addCookies(cookiesToSet);
}

export async function hasApiStub(page: Page, method: HttpMethod, endpoint: string): Promise<boolean> {
  const stubs = await getStubs(page);
  return stubs.some((s) => s.method === method && s.endpoint === endpoint);
}
