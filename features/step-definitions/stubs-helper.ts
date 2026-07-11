import type { ApiStub, HttpMethod } from "../../infrastructure/api/types";
import { page } from "./landing_page_visualization_steps";
import { parseE2EStubsFromCookies, createE2EStubCookies } from "../../infrastructure/api/e2e-stubs-utils";

export { ApiStub, HttpMethod };
/*
 * Example:
 * await addApiStub({ method: "POST", endpoint: "/providers", status: 201, body: { id: "1" } });
 */
async function getStubs(): Promise<ApiStub[]> {
  const cookies = await page.context().cookies();
  return parseE2EStubsFromCookies(cookies);
}

export async function addApiStub(stub: ApiStub): Promise<void> {
  let stubs = await getStubs();
  stubs = stubs.filter(s => !(s.method === stub.method && s.endpoint === stub.endpoint));
  stubs.push(stub);

  const cookiesToSet = createE2EStubCookies(stubs);
  await page.context().addCookies(cookiesToSet);
}

export async function hasApiStub(method: HttpMethod, endpoint: string): Promise<boolean> {
  const stubs = await getStubs();
  return stubs.some(s => s.method === method && s.endpoint === endpoint);
}
