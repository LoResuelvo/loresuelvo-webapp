import type { ApiStub } from "./types";

export const E2E_SESSION_COOKIE = "__e2e_session";
const E2E_API_STUBS_COOKIE_PREFIX = "__e2e_api_stubs_";
const E2E_COOKIE_DOMAIN = "localhost";
const E2E_COOKIE_PATH = "/";
const E2E_CHUNK_SIZE = 1000;
const E2E_MAX_CHUNKS = 20;

export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
}

export function parseE2EStubsFromCookies(cookies: Cookie[]): ApiStub[] {
  const chunks = cookies
    .filter((c) => c.name.startsWith(E2E_API_STUBS_COOKIE_PREFIX))
    .sort((a, b) => {
      const numA = parseInt(a.name.replace(E2E_API_STUBS_COOKIE_PREFIX, ""), 10) || 0;
      const numB = parseInt(b.name.replace(E2E_API_STUBS_COOKIE_PREFIX, ""), 10) || 0;
      return numA - numB;
    });

  if (chunks.length === 0) return [];

  const stubsCookieValue = chunks.map((c) => c.value).join("");
  try {
    return JSON.parse(decodeURIComponent(stubsCookieValue)) as ApiStub[];
  } catch {
    return [];
  }
}

export function createE2EStubCookies(stubs: ApiStub[]): Cookie[] {
  const fullValue = encodeURIComponent(JSON.stringify(stubs));
  
  const chunks: string[] = [];
  let i = 0;
  while (i < fullValue.length) {
    let size = E2E_CHUNK_SIZE;
    if (i + size < fullValue.length) {
      if (fullValue[i + size - 1] === '%') size -= 1;
      else if (fullValue[i + size - 2] === '%') size -= 2;
    }
    chunks.push(fullValue.slice(i, i + size));
    i += size;
  }

  const cookiesToSet: Cookie[] = [];

  // Set new active chunks
  for (let i = 0; i < chunks.length; i++) {
    cookiesToSet.push({
      name: `${E2E_API_STUBS_COOKIE_PREFIX}${i}`,
      value: chunks[i],
      domain: E2E_COOKIE_DOMAIN,
      path: E2E_COOKIE_PATH,
    });
  }

  // Clear any remaining old chunks
  for (let i = chunks.length; i < E2E_MAX_CHUNKS; i++) {
    cookiesToSet.push({
      name: `${E2E_API_STUBS_COOKIE_PREFIX}${i}`,
      value: "",
      domain: E2E_COOKIE_DOMAIN,
      path: E2E_COOKIE_PATH,
      expires: 1, // Expire in the past
    });
  }

  return cookiesToSet;
}
