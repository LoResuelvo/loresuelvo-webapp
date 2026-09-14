import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeforeSessionSavedHook, SessionData } from "@auth0/nextjs-auth0/types";

const { MockAuth0Client, mockGetApiUrl, mockGetAuth0RuntimeConfig } = vi.hoisted(() => ({
  MockAuth0Client: vi.fn(),
  mockGetApiUrl: vi.fn(),
  mockGetAuth0RuntimeConfig: vi.fn(),
}));

vi.mock("@auth0/nextjs-auth0/server", () => ({
  Auth0Client: MockAuth0Client,
}));

vi.mock("@/infrastructure/config/server-env", () => ({
  getApiUrl: mockGetApiUrl,
  getAuth0RuntimeConfig: mockGetAuth0RuntimeConfig,
}));

function createSession(): SessionData {
  return {
    user: { sub: "auth0|123", isOnboarded: false },
    tokenSet: {
      accessToken: "access-token",
      expiresAt: 1_800_000_000,
    },
    internal: {
      sid: "session-id",
      createdAt: 1_700_000_000,
    },
  };
}

async function getBeforeSessionSavedHook(): Promise<BeforeSessionSavedHook> {
  vi.resetModules();
  const { getAuth0Client } = await import("./auth0");
  getAuth0Client();

  const options = MockAuth0Client.mock.calls.at(-1)?.[0] as {
    beforeSessionSaved?: BeforeSessionSavedHook;
  } | undefined;
  if (!options?.beforeSessionSaved) {
    throw new Error("beforeSessionSaved hook was not configured");
  }

  return options.beforeSessionSaved;
}

describe("getAuth0Client beforeSessionSaved", () => {
  beforeEach(() => {
    MockAuth0Client.mockClear();
    mockGetApiUrl.mockReturnValue("https://api.example.com");
    mockGetAuth0RuntimeConfig.mockReturnValue({
      domain: "example.auth0.com",
      clientId: "client-id",
      clientSecret: "client-secret",
      secret: "secret",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps the lower-case API response and hydrates a valid profile photo", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Ana",
        surname: "Pérez",
        role: "consumer",
        profile_photo: { url: "https://cdn.example.com/avatar.png" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const hook = await getBeforeSessionSavedHook();
    const session = createSession();
    await hook(session, null);

    expect(session.user).toMatchObject({
      isOnboarded: true,
      given_name: "Ana",
      family_name: "Pérez",
      role: "consumer",
      profilePhotoUrl: "https://cdn.example.com/avatar.png",
    });
  });

  it("keeps the session fallback when the API response is malformed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Name: "Ana", Surname: "Pérez", Role: "consumer" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const hook = await getBeforeSessionSavedHook();
    const session = createSession();
    await hook(session, null);

    expect(session.user).toEqual({ sub: "auth0|123", isOnboarded: false });
  });

  it("ignores a malformed profile photo without failing the login callback", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Ana",
        surname: "Pérez",
        role: "consumer",
        profile_photo: { url: 42 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const hook = await getBeforeSessionSavedHook();
    const session = createSession();
    await hook(session, null);

    expect(session.user).toMatchObject({
      isOnboarded: true,
      given_name: "Ana",
      family_name: "Pérez",
      role: "consumer",
    });
    expect(session.user).not.toHaveProperty("profilePhotoUrl");
  });
});
