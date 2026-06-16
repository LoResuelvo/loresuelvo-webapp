import type { ApiStub, HttpMethod } from "../../infrastructure/api/types";
import { page } from "./landing_page_visualization_steps";

export { ApiStub, HttpMethod };

const E2E_API_STUBS_COOKIE = "__e2e_api_stubs";

async function getStubs(): Promise<ApiStub[]> {
  const cookies = await page.context().cookies();
  const stubsCookie = cookies.find(c => c.name === E2E_API_STUBS_COOKIE);
  if (!stubsCookie?.value) return [];
  try {
    return JSON.parse(decodeURIComponent(stubsCookie.value));
  } catch {
    return [];
  }
}

/*
 * Example:
 * await addApiStub({ method: "POST", endpoint: "/providers", status: 201, body: { id: "1" } });
 */
export async function addApiStub(stub: ApiStub): Promise<void> {
  let stubs = await getStubs();
  stubs = stubs.filter(s => !(s.method === stub.method && s.endpoint === stub.endpoint));
  stubs.push(stub);

  await page.context().addCookies([{
    name: E2E_API_STUBS_COOKIE,
    value: encodeURIComponent(JSON.stringify(stubs)),
    domain: "localhost",
    path: "/",
  }]);
}

export async function hasApiStub(method: HttpMethod, endpoint: string): Promise<boolean> {
  const stubs = await getStubs();
  return stubs.some(s => s.method === method && s.endpoint === endpoint);
}
